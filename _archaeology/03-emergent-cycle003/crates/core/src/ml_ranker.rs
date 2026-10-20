// Cycle 5: Result Ranking ML
// Beyond-baseline: Machine learning-based result ranking

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RankingFeatures {
    pub text_match_score: f64,
    pub stars: f64,
    pub recency_days: f64,
    pub code_quality: f64,
    pub community_engagement: f64,
}

#[derive(Serialize, Deserialize)]
pub struct MLRanker {
    weights: HashMap<String, f64>,
    feature_history: Vec<(RankingFeatures, f64)>, // (features, actual_relevance)
}

impl MLRanker {
    pub fn new() -> Self {
        let mut weights = HashMap::new();
        
        // Initial weights (would be learned from data)
        weights.insert("text_match".to_string(), 0.3);
        weights.insert("stars".to_string(), 0.2);
        weights.insert("recency".to_string(), 0.15);
        weights.insert("quality".to_string(), 0.25);
        weights.insert("engagement".to_string(), 0.1);
        
        Self {
            weights,
            feature_history: Vec::new(),
        }
    }

    pub fn load(path: impl AsRef<Path>) -> anyhow::Result<Self> {
        let file = fs::File::open(path)?;
        let reader = std::io::BufReader::new(file);
        let ranker = serde_json::from_reader(reader)?;
        Ok(ranker)
    }

    pub fn save(&self, path: impl AsRef<Path>) -> anyhow::Result<()> {
        let file = fs::File::create(path)?;
        let writer = std::io::BufWriter::new(file);
        serde_json::to_writer_pretty(writer, self)?;
        Ok(())
    }

    // Compute ranking score using weighted features
    pub fn rank(&self, features: &RankingFeatures) -> f64 {
        let text_w = self.weights.get("text_match").unwrap_or(&0.3);
        let stars_w = self.weights.get("stars").unwrap_or(&0.2);
        let recency_w = self.weights.get("recency").unwrap_or(&0.15);
        let quality_w = self.weights.get("quality").unwrap_or(&0.25);
        let engagement_w = self.weights.get("engagement").unwrap_or(&0.1);

        text_w * features.text_match_score
            + stars_w * features.stars.min(10000.0) / 10000.0
            + recency_w * (1.0 / (1.0 + features.recency_days / 365.0))
            + quality_w * features.code_quality
            + engagement_w * features.community_engagement
    }

    // Record user feedback for learning
    pub fn record_feedback(&mut self, features: RankingFeatures, relevance: f64) {
        self.feature_history.push((features, relevance));
        
        // Simple online learning: adjust weights based on feedback
        if self.feature_history.len() % 100 == 0 {
            self.update_weights();
        }
    }

    // Gradient descent-style weight update
    fn update_weights(&mut self) {
        let learning_rate = 0.01;
        
        for (features, actual) in &self.feature_history {
            let predicted = self.rank(features);
            let error = actual - predicted;
            
            // Update each weight proportional to its feature value and error
            if let Some(w) = self.weights.get_mut("text_match") {
                *w += learning_rate * error * features.text_match_score;
            }
            if let Some(w) = self.weights.get_mut("stars") {
                *w += learning_rate * error * (features.stars / 10000.0);
            }
            // ... similar for other weights
        }
        
        // Normalize weights to sum to 1.0
        let sum: f64 = self.weights.values().sum();
        for w in self.weights.values_mut() {
            *w /= sum;
        }
    }
}
