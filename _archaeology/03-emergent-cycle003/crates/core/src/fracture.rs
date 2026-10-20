use std::sync::Arc;
use tokio::sync::Mutex;
use crate::{GitHubSearchClient, SearchRequest, SearchResult, SearchCategory};
use crate::multimodal_fusion::MultiModalFusion;

/// Fracture Engine: The Swarm Logic Core
/// Splits a singlular intent into multiple "Time-Vectors" and executes them in parallel.
pub struct FractureEngine {
    fusion: MultiModalFusion,
}

impl FractureEngine {
    pub fn new() -> Self {
        Self {
            fusion: MultiModalFusion::new(),
        }
    }

    /// "The Fracture": Split query and swarm
    pub async fn fracture_and_burn(&self, client: &GitHubSearchClient, base_query: &str) -> crate::Result<Vec<SearchResult>> {
        // 2. Swarm Execution (The Burn)
        // Manual Init since Default is not implemented
        let req_base = SearchRequest {
            query: base_query.to_string(),
            categories: vec![SearchCategory::Code, SearchCategory::Repositories], // sensible default
            per_page: 10,
            raw: false,
            smart: false,
            recursive: false,
        };

        // We'll construct the requests
        let requests: Vec<SearchRequest> = vec![
            SearchRequest { query: base_query.to_string(), ..req_base.clone() },
            SearchRequest { query: format!("{} definition", base_query), ..req_base.clone() },
            SearchRequest { query: format!("{} usage", base_query), ..req_base.clone() },
        ];
        
        // Execute concurrently
        // We need the client to be performant.
        // I will use a simple loop for now to prove concept, OR use `try_join_all`.
        
        let mut results = Vec::new();
        
        // SWARM: Launch 3 simultaneous vectors
        // We use join! macro for fixed 3 vectors
        let f1 = client.execute_search_internal(&requests[0]);
        let f2 = client.execute_search_internal(&requests[1]);
        let f3 = client.execute_search_internal(&requests[2]);
        
        let (r1, r2, r3) = tokio::join!(f1, f2, f3);
        
        // 3. Fusion (The Convergence)
        if let Ok(v) = r1 { results.extend(v); }
        if let Ok(v) = r2 { results.extend(v); }
        if let Ok(v) = r3 { results.extend(v); }

        // Deduplication happens in fusion or here?
        // Simple dedup by URL
        results.sort_by(|a, b| a.url.cmp(&b.url));
        results.dedup_by(|a, b| a.url == b.url);

        Ok(results)
    }
}
