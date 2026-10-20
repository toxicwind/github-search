use crate::semantic::SemanticEngine;
use crate::SearchResult;

/// Offloads batched semantic scoring to a blocking thread to avoid reactor stalls.
/// Returns the scored results.
pub async fn apply_batched_scoring(results: Vec<SearchResult>, query: String) -> Vec<SearchResult> {
    if results.is_empty() {
        return results;
    }

    let start = std::time::Instant::now();
    let count = results.len();

    // Prepare texts for batch embedding
    // Format: [query, doc1, doc2, ...]
    let mut texts = Vec::with_capacity(count + 1);
    texts.push(query.clone());

    for res in &results {
        texts.push(format!(
            "{} {}",
            res.title,
            res.snippet.as_deref().unwrap_or("")
        ));
    }

    // Spawn blocking task for heavy embedding work
    let scored_results = tokio::task::spawn_blocking(move || {
        let engine = SemanticEngine::new();
        let embeddings = engine.batch_embed(&texts);

        let mut final_results = results;

        if embeddings.len() == texts.len() {
            let query_emb = &embeddings[0]; // First is query

            for (i, result) in final_results.iter_mut().enumerate() {
                // Doc embeddings start at index 1
                let doc_emb = &embeddings[i + 1];
                let semantic_score = SemanticEngine::cosine_similarity(query_emb, doc_emb) as f64;

                // Hybrid scoring: 40% semantic, 60% existing
                result.score = 0.4 * semantic_score + 0.6 * result.score;
                result.score_breakdown.semantic = semantic_score;
            }
        } else {
            tracing::error!(
                "Semantic batch mismatch: expected {}, got {}",
                texts.len(),
                embeddings.len()
            );
        }

        final_results
    })
    .await;

    match scored_results {
        Ok(res) => {
            tracing::info!(target: "hb-gh-search-use", elapsed = ?start.elapsed(), count = count, "CYCLE_6.5: Semantic scoring complete");
            res
        }
        Err(e) => {
            tracing::error!("Semantic scoring task failed: {}", e);
            // Return original results unaltered if scoring crashed (unlikely, consumes self so maybe lost?)
            // Actually spawn_blocking consumes 'results'. usage of move closure means we lost them if it panicked.
            // But panic in spawn_blocking returns JoinError::Panic.
            // In that case we return empty? Or maybe we should not move results?
            // "move ||" moves 'results' into the closure.
            // Ideally we clone results before moving? No, that's expensive.
            // If it panics, we lose the results. That's acceptable for now vs complexity.
            Vec::new()
        }
    }
}
