// Integration Example: Wiring All Cycles Together
// This demonstrates how to use all 10 cycles in a unified search pipeline

use crate::{
    adversarial::AdversarialGenerator,
    collaborative_filter::CollaborativeFilter,
    dependency_graph::DependencyGraph,
    explainable_scorer::ExplainableScorer,
    fracture::FractureEngine,
    incremental_cache::IncrementalCache,
    ml_ranker::{MLRanker, RankingFeatures},
    multimodal_fusion::MultiModalFusion,
    pattern_donor::PatternDonorEngine,
    query_mutator::QueryMutator,
    ranking::{load_samples, persist_weights, RankWeights, WeightTuningPipeline},
    semantic::SemanticEngine,
    temporal_analyzer::TemporalAnalyzer,
    SearchRequest, SearchResult,
};
use std::time::Duration;

use serde_json;
use std::fs;
use std::path::{Path, PathBuf};

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
    pub donor: PatternDonorEngine,
    pub rank_weights: RankWeights,
    pub weight_tuner: WeightTuningPipeline,

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
            }
            Err(_) => MLRanker::with_ltr(Some(data_dir.join("ltr.model"))),
        };

        // Try load Temporal History
        let temporal_path = data_dir.join("history.json");
        let temporal = match TemporalAnalyzer::load(&temporal_path) {
            Ok(t) => {
                tracing::info!("Loaded history from {:?}", temporal_path);
                t
            }
            Err(_) => TemporalAnalyzer::new(30), // 30 day window
        };
        let weight_tuner = WeightTuningPipeline::default();
        let rank_weights = Self::load_rank_weights(&data_dir, &weight_tuner);

        // Try load Incremental Cache
        let cache_path = data_dir.join("cache.json");
        let cache = match IncrementalCache::load(&cache_path) {
            Ok(c) => {
                tracing::info!("Loaded cache from {:?}", cache_path);
                c
            }
            Err(_) => IncrementalCache::new(Duration::from_secs(3600), 1000),
        };

        Self {
            semantic: SemanticEngine::new(),
            dependency_graph: DependencyGraph::new(),
            cache,
            mutator: QueryMutator::new(),
            ranker,
            temporal,
            fusion: MultiModalFusion::new(),
            adversarial: AdversarialGenerator::new(),
            collaborative: CollaborativeFilter::new(),
            explainer: ExplainableScorer::new(rank_weights.clone()),
            fracture: FractureEngine::new(),
            donor: PatternDonorEngine::new(),
            rank_weights,
            weight_tuner,
            data_dir,
            update_counter: 0,
        }
    }

    fn load_rank_weights(data_dir: &Path, tuner: &WeightTuningPipeline) -> RankWeights {
        let weights_path = data_dir.join("rank_weights.json");
        if let Ok(raw) = fs::read_to_string(&weights_path) {
            if let Ok(weights) = serde_json::from_str::<RankWeights>(&raw) {
                return weights;
            }
        }

        let sample_path = data_dir.join("rank_samples.json");
        if let Ok(samples) = load_samples(&sample_path) {
            if !samples.is_empty() {
                let (tuned, rmse) = tuner.tune(&samples, RankWeights::experimental_default());
                tracing::info!(
                    "Tuned ranking weights from {} samples (rmse {:.3})",
                    samples.len(),
                    rmse
                );
                let _ = persist_weights(&weights_path, &tuned);
                return tuned;
            }
        }

        RankWeights::experimental_default()
    }

    pub fn save_state(&self) {
        if let Err(e) = self.ranker.save(self.data_dir.join("ml_weights.json")) {
            tracing::error!("Failed to save ML weights: {}", e);
        }
        if let Err(e) = self.temporal.save(self.data_dir.join("history.json")) {
            tracing::error!("Failed to save history: {}", e);
        }
        if let Err(e) =
            persist_weights(&self.data_dir.join("rank_weights.json"), &self.rank_weights)
        {
            tracing::error!("Failed to save rank weights: {}", e);
        }
        if let Err(e) = self.cache.save(self.data_dir.join("cache.json")) {
            tracing::error!("Failed to save cache: {}", e);
        }
    }

    fn check_save(&mut self) {
        self.update_counter += 1;
        if self.update_counter.is_multiple_of(10) {
            self.save_state();
        }
    }

    pub async fn search(
        &mut self,
        client: &crate::GitHubSearchClient,
        request: &SearchRequest,
        _user_id: &str,
    ) -> crate::Result<Vec<SearchResult>> {
        let start_total = std::time::Instant::now();

        // Step 1: Check if query is adversarial
        let start_step = std::time::Instant::now();
        if self.adversarial.is_problematic(&request.query) {
            tracing::warn!(target: "hb-gh-search-use", query = %request.query, "CYCLE_1: Adversarial query detected");
            return Ok(Vec::new());
        }
        tracing::debug!(target: "hb-gh-search-use", elapsed = ?start_step.elapsed(), "CYCLE_1: Adversarial check complete");

        // Step 2: Check cache
        let start_step = std::time::Instant::now();
        if let Some(cached) = self.cache.get(&request.query) {
            tracing::info!(target: "hb-gh-search-use", query = %request.query, "CYCLE_2: Cache HIT");
            return Ok(cached);
        }
        tracing::debug!(target: "hb-gh-search-use", elapsed = ?start_step.elapsed(), "CYCLE_2: Cache complete");

        // Step 3: Find similar past queries (semantic deduplication)
        let start_step = std::time::Instant::now();
        let _similar = self.semantic.find_similar_queries(&request.query, &[], 0.8);
        tracing::debug!("Step 3 (Semantic) took {:?}", start_step.elapsed());

        // Check if query is an exact match (quoted) or a simple identifier
        let is_exact_match = request.query.starts_with('"') && request.query.ends_with('"');
        let is_simple_id = !request.query.contains(' ') && request.query.len() > 8; // Heuristic for IDs
        let fast_path = is_exact_match || is_simple_id;

        if fast_path {
            tracing::info!(target: "hb-gh-search-use", query = %request.query, "FAST_PATH: Exact match/ID detected. Skipping swarm & mutations.");
        }

        // Step 4: Generate query mutations (SKIP for Fast Path)
        let start_step = std::time::Instant::now();
        let mut final_results = Vec::new();
        let queries = if request.recursive && !fast_path {
            // PERFORMANCE: No mutations for <3s target - rely on ML ranking
            let mutations = self.mutator.mutate(&request.query, 0);
            let mut q = vec![request.query.clone()];
            q.extend(mutations);
            tracing::info!(target: "hb-gh-search-use", mutation_count = q.len(), queries = ?q, "CYCLE_4: Generated mutations");
            q
        } else {
            vec![request.query.clone()]
        };
        tracing::debug!(target: "hb-gh-search-use", elapsed = ?start_step.elapsed(), "CYCLE_4: Mutations complete");

        // Step 5: Execute multi-modal search
        // Optimized: Concurrent execution with delays ONLY for heavy swarm mode
        let start_step = std::time::Instant::now();

        use futures::StreamExt;

        // Pure concurrent execution with SMART WEIGHTING
        if true {
            tracing::info!(target: "hb-gh-search-use", "CYCLE_5: Starting concurrent execution stream");
            type MutationFuture = std::pin::Pin<
                Box<
                    dyn std::future::Future<Output = (usize, crate::Result<Vec<SearchResult>>)>
                        + Send,
                >,
            >;
            let mut mutation_stream = futures::stream::FuturesUnordered::<MutationFuture>::new();

            for (i, query) in queries.into_iter().enumerate() {
                let mut sub_request = request.clone();
                sub_request.query = query.clone();
                sub_request.raw = true;
                let c_clone = client.clone();
                let _is_original = i == 0; // Track if this is the original query

                mutation_stream.push(Box::pin(async move {
                    // Add tiny jitter to avoid exact burst, but remove heavy delays for fast path
                    if i > 0 && !fast_path {
                        tokio::time::sleep(std::time::Duration::from_millis(100 * i as u64)).await;
                    }

                    // PERFORMANCE: 800ms per-query for <3s total
                    let timeout_duration = std::time::Duration::from_millis(800);

                    let result = match tokio::time::timeout(
                        timeout_duration,
                        c_clone.execute_search_internal(&sub_request),
                    )
                    .await
                    {
                        Ok(Ok(res)) => Ok(res),
                        Ok(Err(e)) => Err(e),
                        Err(_) => Ok(Vec::new()),
                    };

                    (i, result)
                }));
            }

            // Collect results with smart weighting
            let mut weighted_results: Vec<(SearchResult, f64)> = Vec::new();

            while let Some((query_idx, result)) = mutation_stream.next().await {
                match result {
                    Ok(mut res) => {
                        // SMART WEIGHTING: Original query (idx 0) gets 3x boost, mutations get 1x
                        let weight_multiplier = if query_idx == 0 { 3.0 } else { 1.0 };

                        tracing::info!(
                            target: "hb-gh-search-use",
                            query_idx = query_idx,
                            result_count = res.len(),
                            weight = weight_multiplier,
                            "CYCLE_5: Query completed with weighting"
                        );

                        // Apply weight to each result
                        for mut r in res.drain(..) {
                            r.score *= weight_multiplier;
                            weighted_results.push((r, weight_multiplier));
                        }

                        // Early exit if we found good matches in fast path
                        if fast_path && !weighted_results.is_empty() {
                            break;
                        }
                        if weighted_results.len() >= request.per_page as usize * 3 {
                            break;
                        }
                    }
                    Err(e) => {
                        tracing::error!(target: "hb-gh-search-use", error = ?e, query_idx = query_idx, "CYCLE_5: Sub-search failed");
                    }
                }
            }

            // Sort by weighted score and extract results
            weighted_results.sort_by(|a, b| {
                b.0.score
                    .partial_cmp(&a.0.score)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            final_results = weighted_results.into_iter().map(|(r, _)| r).collect();
        }

        tracing::info!(
            target: "hb-gh-search-use",
            results = final_results.len(),
            elapsed = ?start_step.elapsed(),
            "CYCLE_5: Execution complete with smart weighting"
        );

        // Step 6: Swarm Discovery (Fracture)
        // SKIP for Fast Path
        let sufficient_count = request.per_page as usize;
        if (final_results.len() < sufficient_count) && request.recursive && !fast_path {
            tracing::info!(target: "hb-gh-search-use", query = %request.query, count = final_results.len(), "CYCLE_6: Triggering FRACTURE due to insufficient results");
            match self
                .fracture
                .fracture_and_burn(client, &request.query)
                .await
            {
                Ok(swarm_results) => {
                    tracing::info!(target: "hb-gh-search-use", new_results = swarm_results.len(), "CYCLE_6: Fracture integration complete");
                    final_results.extend(swarm_results);
                }
                Err(e) => {
                    tracing::error!(target: "hb-gh-search-use", error = %e, "CYCLE_6: Swarm fracture failed")
                }
            }
        }

        // Step 6.4: PATTERN DONOR HARVESTING (Emergent Discovery)
        if request.recursive && !fast_path {
            tracing::info!(target: "hb-gh-search-use", query = %request.query, "CYCLE_6.4: Triggering PATTERN DONOR HARVESTING");
            match self.donor.harvest_donors(client, &request.query).await {
                Ok(donors) => {
                    tracing::info!(target: "hb-gh-search-use", donor_count = donors.len(), "CYCLE_6.4: Donor integration complete");
                    final_results.extend(donors);
                }
                Err(e) => {
                    tracing::error!(target: "hb-gh-search-use", error = %e, "CYCLE_6.4: Donor harvesting failed");
                }
            }
        }

        // Step 6.5: SEMANTIC SCORING (NEW - Batched & Non-Blocking)
        final_results =
            crate::semantic_scoring::apply_batched_scoring(final_results, request.query.clone())
                .await;

        // Step 7: Record temporal pattern & Apply Advanced Ranking
        self.temporal
            .record_search(request.query.clone(), final_results.len());

        let local_lang = if request.smart {
            crate::context_awareness::detect_local_language()
        } else {
            None
        };

        if let Some(ref l) = local_lang {
            tracing::info!("Boosting results for local language context: {}", l);
        }

        // Call the advanced ranker to compute BM25, identifier matches, etc.
        crate::ranking::apply_experimental_ranking(
            &mut final_results,
            &request.query,
            &self.rank_weights,
            local_lang.as_deref(),
        );

        self.check_save();
        tracing::info!(target: "hb-gh-search-use", "CYCLE_7: Advanced Ranking (BM25/Local Context) applied");

        // Step 8: Re-rank with ML
        for result in &mut final_results {
            let features = RankingFeatures {
                text_match_score: result.score_breakdown.text_match,
                stars: result.stars.unwrap_or(0) as f64,
                recency_days: 30.0, // Approximation
                code_quality: result.score_breakdown.readability,
                community_engagement: result.score_breakdown.popularity.max(0.5),
                bm25: result.score_breakdown.bm25,
                identifier_score: result.score_breakdown.identifier,
                language_affinity: result.score_breakdown.language_affinity,
                popularity: result.score_breakdown.popularity,
                commit_recency: result.score_breakdown.commit_recency,
            };
            let ml_score = self.ranker.rank_with_ltr(&features);
            result.score_breakdown.ml = ml_score; // Store for visibility
            result.score = result.score * 0.7 + ml_score * 0.3;
        }
        tracing::info!(target: "hb-gh-search-use", "CYCLE_8: ML Re-ranking (LTR) complete");

        // Step 9: Generate explanations for top results
        for result in final_results.iter_mut().take(5) {
            let explanation = self.explainer.explain(result);
            result.evaluation = Some(self.explainer.to_text(&explanation));
        }
        tracing::info!(target: "hb-gh-search-use", "CYCLE_9: Explanations generated for top results");

        // Step 10: Cache results
        if !final_results.is_empty() {
            self.cache
                .insert(request.query.clone(), final_results.clone(), vec![]);
        }
        tracing::info!(target: "hb-gh-search-use", total_elapsed = ?start_total.elapsed(), "CYCLE_10: SEARCH_COMPLETE");

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
            bm25: 1.0,
            identifier_score: 0.6,
            language_affinity: 0.3,
            popularity: 0.8,
            commit_recency: 0.5,
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
            experimental: false,
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
        assert!(engine
            .adversarial
            .is_problematic("<script>alert('xss')</script>"));
        assert!(!engine.adversarial.is_problematic("normal query"));
    }
}
