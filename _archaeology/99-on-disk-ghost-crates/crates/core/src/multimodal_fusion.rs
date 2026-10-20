// Cycle 7: Multi-Modal Search Fusion
// Beyond-baseline: Combine text, code structure, and metadata searches

use crate::SearchResult;
use std::collections::HashMap;

#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub enum SearchMode {
    Text,
    Structure,
    Metadata,
    Hybrid,
}

pub struct MultiModalFusion {
    mode_weights: HashMap<SearchMode, f64>,
}

impl Default for MultiModalFusion {
    fn default() -> Self {
        Self::new()
    }
}

impl MultiModalFusion {
    pub fn new() -> Self {
        let mut mode_weights = HashMap::new();
        mode_weights.insert(SearchMode::Text, 0.4);
        mode_weights.insert(SearchMode::Structure, 0.3);
        mode_weights.insert(SearchMode::Metadata, 0.3);

        Self { mode_weights }
    }

    /// Fuses results from multiple vectors into a single ranked list using Weighted Reciprocal Rank Fusion
    /// Accepts a dynamic list of result vectors (e.g. from Swarm/Fracture)
    pub fn fuse_results(&self, vectors: Vec<Vec<SearchResult>>) -> Vec<SearchResult> {
        // Pre-allocate to avoid resizing
        let estimated_capacity = vectors.iter().map(|v| v.len()).sum();
        let mut result_map: HashMap<String, SearchResult> =
            HashMap::with_capacity(estimated_capacity);

        // Iterate over all result vectors
        for (vec_idx, results) in vectors.into_iter().enumerate() {
            // Decay weight slightly for subsequent vectors (assuming prioritized order)
            // or keep uniform if peers. Let's use specific mode weights if we can,
            // otherwise decay: 1.0, 0.9, 0.8... to favor primary variants
            let weight = 1.0 * 0.9f64.powi(vec_idx as i32);

            for (rank, mut item) in results.into_iter().enumerate() {
                // RRF Score: 1 / (k + rank)
                let rrf_score = weight * (1.0 / (60.0 + rank as f64));
                let context_bonus = 0.0; // Todo: pass in context per vector?

                result_map
                    .entry(item.url.clone())
                    .and_modify(|existing| {
                        // Boost existing item
                        existing.score += rrf_score;
                        existing.score_breakdown.fusion += rrf_score;
                        existing.score_breakdown.context += context_bonus;
                    })
                    .or_insert_with(|| {
                        item.score = rrf_score;
                        item.score_breakdown.fusion = rrf_score;
                        item.score_breakdown.context = context_bonus;
                        item
                    });
            }
        }

        // Convert back to vector and sort
        let mut fused: Vec<SearchResult> = result_map.into_values().collect();

        // Optimized sort without unwrap()
        fused.sort_unstable_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        fused
    }

    // Adaptive weight adjustment based on query type
    pub fn adjust_weights_for_query(&mut self, query: &str) {
        if query.contains("struct") || query.contains("class") || query.contains("fn") {
            // Structure-heavy query
            self.mode_weights.insert(SearchMode::Structure, 0.5);
            self.mode_weights.insert(SearchMode::Text, 0.3);
            self.mode_weights.insert(SearchMode::Metadata, 0.2);
        } else if query.contains("stars:") || query.contains("language:") {
            // Metadata-heavy query
            self.mode_weights.insert(SearchMode::Metadata, 0.5);
            self.mode_weights.insert(SearchMode::Text, 0.3);
            self.mode_weights.insert(SearchMode::Structure, 0.2);
        } else {
            // Default balanced
            self.mode_weights.insert(SearchMode::Text, 0.4);
            self.mode_weights.insert(SearchMode::Structure, 0.3);
            self.mode_weights.insert(SearchMode::Metadata, 0.3);
        }
    }
}
