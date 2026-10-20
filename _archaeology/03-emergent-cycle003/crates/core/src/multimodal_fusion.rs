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

impl MultiModalFusion {
    pub fn new() -> Self {
        let mut mode_weights = HashMap::new();
        mode_weights.insert(SearchMode::Text, 0.4);
        mode_weights.insert(SearchMode::Structure, 0.3);
        mode_weights.insert(SearchMode::Metadata, 0.3);
        
        Self { mode_weights }
    }

    // Fuse results from different search modes
    pub fn fuse_results(
        &self,
        text_results: Vec<SearchResult>,
        structure_results: Vec<SearchResult>,
        metadata_results: Vec<SearchResult>,
    ) -> Vec<SearchResult> {
        let mut result_scores: HashMap<String, (SearchResult, f64)> = HashMap::new();

        // Score text results
        for result in text_results {
            let weight = self.mode_weights.get(&SearchMode::Text).unwrap_or(&0.4);
            let score = result.score * weight;
            result_scores.insert(
                result.url.clone(),
                (result, score),
            );
        }

        // Merge structure results
        for result in structure_results {
            let weight = self.mode_weights.get(&SearchMode::Structure).unwrap_or(&0.3);
            let score = result.score * weight;
            
            result_scores
                .entry(result.url.clone())
                .and_modify(|(_, s)| *s += score)
                .or_insert((result, score));
        }

        // Merge metadata results
        for result in metadata_results {
            let weight = self.mode_weights.get(&SearchMode::Metadata).unwrap_or(&0.3);
            let score = result.score * weight;
            
            result_scores
                .entry(result.url.clone())
                .and_modify(|(_, s)| *s += score)
                .or_insert((result, score));
        }

        // Sort by fused score
        let mut fused: Vec<(SearchResult, f64)> = result_scores.into_values().collect();
        fused.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        fused.into_iter().map(|(mut r, score)| {
            r.score = score;
            r
        }).collect()
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
