// Integration Example: Wiring All Cycles Together
// This demonstrates how to use all 10 cycles in a unified search pipeline

use crate::{
    semantic::SemanticEngine,
    dependency_graph::DependencyGraph,
    incremental_cache::IncrementalCache,
    query_mutator::QueryMutator,
    ml_ranker::{MLRanker, RankingFeatures},
    temporal_analyzer::TemporalAnalyzer,
    multimodal_fusion::MultiModalFusion,
    adversarial::AdversarialGenerator,
    collaborative_filter::CollaborativeFilter,
    explainable_scorer::ExplainableScorer,
    fracture::FractureEngine,
    SearchResult, SearchRequest,
};
use std::time::Duration;

use std::path::PathBuf;
use std::fs;

pub struct UnifiedSearchEngine {
    pub semantic: SemanticEngine,
    pub dependency_graph: DependencyGraph,
    pub cache: IncrementalCache<Vec<SearchResult>>,
    pub mutator: QueryMutator,
    pub ranker: MLRanker,
    pub temporal: TemporalAnalyzer,
    pub fusion: MultiModalFusion,
    pub adversarial: AdversarialGenerator,
    pub collaborative: CollaborativeFilter,
    pub explainer: ExplainableScorer,
    pub fracture: FractureEngine,
    
    // Persistence
    data_dir: PathBuf,
    update_counter: usize,
}

impl UnifiedSearchEngine {
    pub fn new(data_dir: impl Into<PathBuf>) -> Self {
        let data_dir = data_dir.into();
        
        // Ensure data directory exists
        if let Err(e) = fs::create_dir_all(&data_dir) {
            tracing::warn!("Failed to create data directory {:?}: {}", data_dir, e);
        }

        // Try load ML Ranker
        let ranker_path = data_dir.join("ml_weights.json");
        let ranker = match MLRanker::load(&ranker_path) {
            Ok(r) => {
                tracing::info!("Loaded ML weights from {:?}", ranker_path);
                r
            },
            Err(_) => MLRanker::new(),
        };

        // Try load Temporal History
        let temporal_path = data_dir.join("history.json");
        let temporal = match TemporalAnalyzer::load(&temporal_path) {
            Ok(t) => {
                tracing::info!("Loaded history from {:?}", temporal_path);
                t
            },
            Err(_) => TemporalAnalyzer::new(30), // 30 day window
        };

        Self {
            semantic: SemanticEngine::new(),
            dependency_graph: DependencyGraph::new(),
            cache: IncrementalCache::new(Duration::from_secs(3600), 1000),
            mutator: QueryMutator::new(),
            ranker,
            temporal,
            fusion: MultiModalFusion::new(),
            adversarial: AdversarialGenerator::new(),
            collaborative: CollaborativeFilter::new(),
            explainer: ExplainableScorer::new(),
            fracture: FractureEngine::new(),
            data_dir,
            update_counter: 0,
        }
    }

    pub fn save_state(&self) {
        if let Err(e) = self.ranker.save(self.data_dir.join("ml_weights.json")) {
            tracing::error!("Failed to save ML weights: {}", e);
        }
        if let Err(e) = self.temporal.save(self.data_dir.join("history.json")) {
            tracing::error!("Failed to save history: {}", e);
        }
    }

    fn check_save(&mut self) {
        self.update_counter += 1;
        if self.update_counter % 10 == 0 {
            self.save_state();
        }
    }

    pub async fn search(&mut self, client: &crate::GitHubSearchClient, request: &SearchRequest, _user_id: &str) -> crate::Result<Vec<SearchResult>> {
        // Step 1: Check if query is adversarial
        if self.adversarial.is_problematic(&request.query) {
            tracing::warn!("Adversarial query detected: {}", request.query);
            return Ok(Vec::new());
        }

        // Step 2: Check cache
        if let Some(cached) = self.cache.get(&request.query) {
            tracing::info!("Cache hit for query: {}", request.query);
            return Ok(cached);
        }

        // Step 3: Find similar past queries (semantic deduplication)
        // Note: For now, this is informational, but could be used to steer search
        let _similar = self.semantic.find_similar_queries(&request.query, 0.8);

        // Step 4: Generate query mutations for better coverage if requested
        let mut final_results = Vec::new();
        let queries = if request.recursive {
             let mut q = self.mutator.mutate(&request.query, 3);
             q.insert(0, request.query.clone());
             q
        } else {
             vec![request.query.clone()]
        };

        // Step 5: Execute multi-modal search (Currently we just call client.execute_search)
        // We iterate through mutations if necessary
        for query in queries {
            let mut sub_request = request.clone();
            sub_request.query = query;
            
            // Execute the actual network search
            let results = client.execute_search_internal(&sub_request).await?;
            final_results.extend(results);
            
            if !final_results.is_empty() {
                break; // Stop after first successful mutation or original query
            }
        }

        if final_results.is_empty() && request.recursive {
             // Step 6: Swarm Discovery (Fracture)
             tracing::info!("Fracturing query for swarm discovery: {}", request.query);
             match self.fracture.fracture_and_burn(client, &request.query).await {
                 Ok(swarm_results) => final_results.extend(swarm_results),
                 Err(e) => tracing::error!("Swarm fracture failed: {}", e),
             }
        }

        // Step 7: Record temporal pattern
        self.temporal.record_search(request.query.clone(), final_results.len());
        self.check_save();

        // Step 8: Re-rank with ML
        for result in &mut final_results {
            let features = RankingFeatures {
                text_match_score: result.score_breakdown.text_match,
                stars: result.stars.unwrap_or(0) as f64,
                recency_days: 30.0, // Approximation
                code_quality: result.score_breakdown.readability,
                community_engagement: 0.5,
            };
            let ml_score = self.ranker.rank(&features);
            result.score = result.score * 0.7 + ml_score * 0.3;
        }

        // Step 9: Generate explanations for top results
        for result in final_results.iter_mut().take(5) {
            let explanation = self.explainer.explain(result);
            result.evaluation = Some(self.explainer.to_text(&explanation));
        }

        // Step 10: Cache results
        if !final_results.is_empty() {
            self.cache.insert(request.query.clone(), final_results.clone(), vec![]);
        }

        Ok(final_results)
    }

    // Provide user feedback for ML learning
    pub fn record_feedback(&mut self, _result_url: &str, relevance: f64) {
        // Would extract features from the result
        let features = RankingFeatures {
            text_match_score: 0.8,
            stars: 1000.0,
            recency_days: 10.0,
            code_quality: 0.9,
            community_engagement: 0.7,
        };
        self.ranker.record_feedback(features, relevance);
        self.check_save();
    }

    // Get trending queries
    pub fn get_trends(&self) -> Vec<(String, f64)> {
        self.temporal.detect_trends()
    }

    // Detect search cycles
    pub fn get_cycles(&self) -> Vec<(String, Duration)> {
        self.temporal
            .detect_cycles()
            .into_iter()
            .filter_map(|(q, delta)| delta.to_std().ok().map(|d| (q, d)))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_unified_search() {
        let mut engine = UnifiedSearchEngine::new("gen_test_data");
        let client = crate::GitHubSearchClient::new(None);
        let request = SearchRequest {
            query: "rust async await".to_string(),
            categories: vec![],
            per_page: 10,
            raw: false,
            smart: true,
            recursive: false,
        };

        let results = engine.search(&client, &request, "user123").await;
        assert!(results.is_ok());
        if let Ok(r) = results {
            assert!(r.len() <= 10);
        }
    }

    #[test]
    fn test_adversarial_detection() {
        let engine = UnifiedSearchEngine::new("gen_test_data");
        assert!(engine.adversarial.is_problematic("<script>alert('xss')</script>"));
        assert!(!engine.adversarial.is_problematic("normal query"));
    }
}
