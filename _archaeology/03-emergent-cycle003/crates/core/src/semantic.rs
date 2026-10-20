// Cycle 1: Semantic Similarity Engine
// Beyond-baseline: Add vector embeddings for semantic search

use std::collections::HashMap;

pub struct SemanticEngine {
    embeddings_cache: HashMap<String, Vec<f32>>,
}

impl SemanticEngine {
    pub fn new() -> Self {
        Self {
            embeddings_cache: HashMap::new(),
        }
    }

    // Compute cosine similarity between two queries
    pub fn similarity(&self, query_a: &str, query_b: &str) -> f32 {
        // Placeholder: In production, use sentence-transformers or similar
        let words_a: Vec<&str> = query_a.split_whitespace().collect();
        let words_b: Vec<&str> = query_b.split_whitespace().collect();
        
        let common = words_a.iter().filter(|w| words_b.contains(w)).count();
        let total = (words_a.len() + words_b.len()) as f32;
        
        if total == 0.0 {
            0.0
        } else {
            (2.0 * common as f32) / total
        }
    }

    // Find semantically similar past queries
    pub fn find_similar_queries(&self, query: &str, threshold: f32) -> Vec<String> {
        self.embeddings_cache
            .keys()
            .filter(|cached_query| self.similarity(query, cached_query) >= threshold)
            .cloned()
            .collect()
    }
}
