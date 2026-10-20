// Cycle 1: Semantic Similarity Engine
// Real ML: Vector embeddings for semantic search using fastembed

use fastembed::TextEmbedding;
use once_cell::sync::Lazy;
use std::sync::Mutex;

// Global embedding model (lazy-loaded, thread-safe via Mutex)
static EMBEDDING_MODEL: Lazy<Mutex<TextEmbedding>> = Lazy::new(|| {
    tracing::info!("Initializing semantic embedding model (all-MiniLM-L6-v2)...");
    let model =
        TextEmbedding::try_new(Default::default()).expect("Failed to initialize embedding model");
    tracing::info!("Semantic embedding model loaded successfully");
    Mutex::new(model)
});

pub struct SemanticEngine {
    // Model is shared globally via EMBEDDING_MODEL
}

impl Default for SemanticEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl SemanticEngine {
    pub fn new() -> Self {
        // Trigger model loading
        let _ = &*EMBEDDING_MODEL;
        Self {}
    }

    /// Embed a single text into a 384-dimensional vector
    pub fn embed(&self, text: &str) -> Vec<f32> {
        self.batch_embed(&[text.to_string()])
            .into_iter()
            .next()
            .unwrap_or_else(|| vec![0.0; 384])
    }

    /// Embed multiple texts in a single batch (optimized)
    pub fn batch_embed(&self, texts: &[String]) -> Vec<Vec<f32>> {
        let mut model = EMBEDDING_MODEL.lock().unwrap();

        // fastembed::TextEmbedding::embed takes Vec<S> where S: AsRef<str>
        // We need to pass the batch.
        match model.embed(texts, None) {
            Ok(embeddings) => embeddings,
            Err(e) => {
                tracing::error!("Batch embedding failed: {}", e);
                vec![vec![0.0; 384]; texts.len()] // Return zero vectors on error
            }
        }
    }

    /// Compute cosine similarity between two embeddings
    pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        if a.len() != b.len() || a.is_empty() {
            return 0.0;
        }

        let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

        if norm_a == 0.0 || norm_b == 0.0 {
            return 0.0;
        }

        dot_product / (norm_a * norm_b)
    }

    /// Compute semantic similarity between two text strings
    pub fn similarity(&self, query_a: &str, query_b: &str) -> f32 {
        let emb_a = self.embed(query_a);
        let emb_b = self.embed(query_b);
        Self::cosine_similarity(&emb_a, &emb_b)
    }

    /// Find semantically similar past queries
    pub fn find_similar_queries(
        &self,
        query: &str,
        candidates: &[String],
        threshold: f32,
    ) -> Vec<String> {
        let query_emb = self.embed(query);

        candidates
            .iter()
            .filter_map(|candidate| {
                let candidate_emb = self.embed(candidate);
                let sim = Self::cosine_similarity(&query_emb, &candidate_emb);
                if sim >= threshold {
                    Some(candidate.clone())
                } else {
                    None
                }
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_semantic_similarity() {
        let engine = SemanticEngine::new();

        // Similar queries should have high similarity
        let sim1 = engine.similarity("rust async programming", "asynchronous rust code");
        assert!(
            sim1 > 0.5,
            "Similar queries should have high similarity: {}",
            sim1
        );

        // Dissimilar queries should have low similarity
        let sim2 = engine.similarity("rust async programming", "quantum physics equations");
        assert!(
            sim2 < 0.5,
            "Dissimilar queries should have low similarity: {}",
            sim2
        );
    }

    #[test]
    fn test_embedding_dimensions() {
        let engine = SemanticEngine::new();
        let emb = engine.embed("test query");
        assert_eq!(
            emb.len(),
            384,
            "all-MiniLM-L6-v2 should produce 384-dim embeddings"
        );
    }
}
