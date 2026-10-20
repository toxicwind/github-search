// Cycle 5: Result Ranking ML
// Beyond-baseline: Machine learning-based result ranking

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[cfg(feature = "ltr-xgboost")]
use anyhow::anyhow;
#[cfg(feature = "ltr-xgboost")]
use xgboost::{Booster, DMatrix};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RankingFeatures {
    pub text_match_score: f64,
    pub stars: f64,
    pub recency_days: f64,
    pub code_quality: f64,
    pub community_engagement: f64,
    pub bm25: f64,
    pub identifier_score: f64,
    pub language_affinity: f64,
    pub popularity: f64,
    pub commit_recency: f64,
}

#[derive(Serialize, Deserialize)]
pub struct MLRanker {
    weights: HashMap<String, f64>,
    feature_history: Vec<(RankingFeatures, f64)>, // (features, actual_relevance)
    #[cfg(feature = "ltr-xgboost")]
    #[serde(skip)]
    ltr_model_path: Option<PathBuf>,
    #[cfg(feature = "ltr-xgboost")]
    #[serde(skip)]
    ltr_model: Option<Booster>,
}

impl Default for MLRanker {
    fn default() -> Self {
        Self::new()
    }
}

impl MLRanker {
    pub fn new() -> Self {
        let mut weights = HashMap::new();

        // Initial weights (would be learned from data)
        weights.insert("text_match".to_string(), 0.20);
        weights.insert("stars".to_string(), 0.15);
        weights.insert("recency".to_string(), 0.10);
        weights.insert("quality".to_string(), 0.12);
        weights.insert("engagement".to_string(), 0.05);
        weights.insert("bm25".to_string(), 0.14);
        weights.insert("identifier".to_string(), 0.09);
        weights.insert("language".to_string(), 0.05);
        weights.insert("popularity".to_string(), 0.05);
        weights.insert("commit_recency".to_string(), 0.05);

        Self {
            weights,
            feature_history: Vec::new(),
            #[cfg(feature = "ltr-xgboost")]
            ltr_model_path: None,
            #[cfg(feature = "ltr-xgboost")]
            ltr_model: None,
        }
    }

    pub fn with_ltr(model_path: Option<PathBuf>) -> Self {
        let ranker = Self::new();
        #[cfg(not(feature = "ltr-xgboost"))]
        {
            let _ = model_path;
            ranker
        }
        #[cfg(feature = "ltr-xgboost")]
        {
            let mut ranker = ranker;
            ranker.ltr_model_path = model_path.clone();
            if let Some(p) = model_path {
                match Booster::load(&p) {
                    Ok(model) => ranker.ltr_model = Some(model),
                    Err(e) => tracing::warn!("LTR model load failed ({}): {}", p.display(), e),
                }
            }
            ranker
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
        let bm25_w = self.weights.get("bm25").unwrap_or(&0.1);
        let identifier_w = self.weights.get("identifier").unwrap_or(&0.1);
        let language_w = self.weights.get("language").unwrap_or(&0.05);
        let popularity_w = self.weights.get("popularity").unwrap_or(&0.05);
        let commit_w = self.weights.get("commit_recency").unwrap_or(&0.05);

        text_w * features.text_match_score
            + stars_w * features.stars.min(10000.0) / 10000.0
            + recency_w * (1.0 / (1.0 + features.recency_days / 365.0))
            + quality_w * features.code_quality
            + engagement_w * features.community_engagement
            + bm25_w * features.bm25
            + identifier_w * features.identifier_score
            + language_w * features.language_affinity
            + popularity_w * features.popularity
            + commit_w * features.commit_recency
    }

    pub fn rank_with_ltr(&self, features: &RankingFeatures) -> f64 {
        let base = self.rank(features);
        #[cfg(feature = "ltr-xgboost")]
        {
            if let Some(model) = &self.ltr_model {
                if let Ok(pred) = Self::predict_xgboost(model, features) {
                    // Blend prototype LTR with legacy ML score; xgboost outputs 0-1.
                    return (base * 0.5 + (pred as f64 * 100.0) * 0.5).clamp(0.0, 100.0);
                }
            }
        }
        base
    }

    #[cfg(feature = "ltr-xgboost")]
    fn predict_xgboost(model: &Booster, features: &RankingFeatures) -> anyhow::Result<f32> {
        let fv: Vec<f32> = vec![
            features.text_match_score as f32,
            features.stars as f32,
            features.recency_days as f32,
            features.code_quality as f32,
            features.community_engagement as f32,
            features.bm25 as f32,
            features.identifier_score as f32,
            features.language_affinity as f32,
            features.popularity as f32,
            features.commit_recency as f32,
        ];
        let dmat = DMatrix::from_dense(&fv, 1, fv.len())?;
        let preds = model.predict(&dmat)?;
        preds
            .first()
            .copied()
            .ok_or_else(|| anyhow::anyhow!("empty prediction"))
    }

    // Record user feedback for learning
    pub fn record_feedback(&mut self, features: RankingFeatures, relevance: f64) {
        self.feature_history.push((features, relevance));

        // Simple online learning: adjust weights based on feedback
        if self.feature_history.len().is_multiple_of(100) {
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
            if let Some(w) = self.weights.get_mut("recency") {
                *w += learning_rate * error * (1.0 / (1.0 + features.recency_days / 365.0));
            }
            if let Some(w) = self.weights.get_mut("quality") {
                *w += learning_rate * error * features.code_quality;
            }
            if let Some(w) = self.weights.get_mut("engagement") {
                *w += learning_rate * error * features.community_engagement;
            }
            if let Some(w) = self.weights.get_mut("bm25") {
                *w += learning_rate * error * features.bm25;
            }
            if let Some(w) = self.weights.get_mut("identifier") {
                *w += learning_rate * error * features.identifier_score;
            }
            if let Some(w) = self.weights.get_mut("language") {
                *w += learning_rate * error * features.language_affinity;
            }
            if let Some(w) = self.weights.get_mut("popularity") {
                *w += learning_rate * error * features.popularity;
            }
            if let Some(w) = self.weights.get_mut("commit_recency") {
                *w += learning_rate * error * features.commit_recency;
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
