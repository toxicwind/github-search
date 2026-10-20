use crate::multimodal_fusion::MultiModalFusion;
use crate::{GitHubSearchClient, SearchCategory, SearchRequest, SearchResult};

/// Cycle 2: The Fracture Engine
// "Split the intent, swarm the problem"
use futures::stream::StreamExt; // FIX: Import StreamExt

pub struct FractureEngine {
    fusion: MultiModalFusion,
}

impl Default for FractureEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl FractureEngine {
    pub fn new() -> Self {
        Self {
            fusion: MultiModalFusion::new(),
        }
    }

    /// "The Fracture": Split query and swarm
    pub async fn fracture_and_burn(
        &self,
        client: &GitHubSearchClient,
        base_query: &str,
    ) -> crate::Result<Vec<SearchResult>> {
        let start = std::time::Instant::now();
        tracing::info!(query = %base_query, "FRACTURE: Starting swarm execution");

        let mut results = Vec::new();

        // 2. Swarm Execution (The Burn)
        let req_base = SearchRequest {
            query: base_query.to_string(),
            categories: vec![SearchCategory::Code, SearchCategory::Repositories],
            per_page: 10,
            raw: true,
            smart: false,
            recursive: false,
            experimental: false,
        };

        tracing::info!("FRACTURE: Launching execution via FuturesUnordered");

        type SearchFuture = std::pin::Pin<
            Box<dyn std::future::Future<Output = (usize, crate::Result<Vec<SearchResult>>)> + Send>,
        >;
        let mut futures = futures::stream::FuturesUnordered::<SearchFuture>::new();

        let decomposed = crate::query_decomposer::QueryDecomposer::smart_decompose(base_query, 5);
        tracing::info!(
            "FRACTURE: Decomposed into {} sub-queries: {:?}",
            decomposed.len(),
            decomposed
        );

        for (i, sub_query) in decomposed.into_iter().enumerate() {
            let q_clone = sub_query.clone();
            let r_clone = req_base.clone();
            let c_clone = client.clone();

            futures.push(Box::pin(async move {
                if i > 0 {
                    tokio::time::sleep(std::time::Duration::from_millis(300 * i as u64)).await;
                }

                let req = SearchRequest {
                    query: q_clone.clone(),
                    ..r_clone
                };

                let result = match tokio::time::timeout(
                    std::time::Duration::from_secs(30),
                    c_clone.execute_search_internal(&req),
                )
                .await
                {
                    Ok(res) => res,
                    Err(_) => {
                        tracing::warn!("Fracture sub-query timed out: {}", q_clone);
                        Ok(Vec::new())
                    }
                };

                (i, result)
            }));
        }

        // Collect results as they arrive
        let mut vector_map: std::collections::BTreeMap<usize, Vec<SearchResult>> =
            std::collections::BTreeMap::new();

        while let Some((idx, result)) = futures.next().await {
            match result {
                Ok(res) => {
                    tracing::info!(
                        target: "hb-gh-search-fracture",
                        idx = idx,
                        count = res.len(),
                        "SWARM_RESULT: Vector returned successfully"
                    );
                    vector_map.insert(idx, res);
                }
                Err(e) => tracing::error!(
                    target: "hb-gh-search-fracture",
                    idx = idx,
                    error = %e,
                    "SWARM_FAILURE: Vector failed"
                ),
            }
        }

        tracing::info!(
            target: "hb-gh-search-fracture",
            vectors = vector_map.len(),
            elapsed = ?start.elapsed(),
            "FRACTURE_SWARM_COMPLETE: All vectors returned"
        );

        // 3. Fusion (The Convergence)
        // Convert map to ordered vector of vectors
        let vectors: Vec<Vec<SearchResult>> = vector_map.into_values().collect();

        // Fuse results using generic RRF
        let fused = self.fusion.fuse_results(vectors);
        tracing::info!(
            target: "hb-gh-search-fracture",
            fused_count = fused.len(),
            "FRACTURE_FUSION_COMPLETE: Multi-modal fusion finished"
        );
        results.extend(fused);

        // Final sanity dedup (though fusion should have handled it)
        results.dedup_by(|a, b| a.url == b.url);

        tracing::info!(
            target: "hb-gh-search-fracture",
            total = results.len(),
            elapsed = ?start.elapsed(),
            "FRACTURE_PROCESS_COMPLETE: Results ready"
        );
        Ok(results)
    }
}
