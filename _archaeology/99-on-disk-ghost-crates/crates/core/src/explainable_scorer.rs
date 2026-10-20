// Cycle 10: Explainable AI Scoring
// Beyond-baseline: Provide explanations for why results were ranked

use crate::RankWeights;
use crate::SearchResult;

#[derive(Debug, Clone)]
pub struct ScoringExplanation {
    pub result_url: String,
    pub total_score: f64,
    pub factors: Vec<ScoringFactor>,
}

#[derive(Debug, Clone)]
pub struct ScoringFactor {
    pub name: String,
    pub value: f64,
    pub weight: f64,
    pub contribution: f64,
    pub explanation: String,
}

pub struct ExplainableScorer {
    weights: RankWeights,
}

impl ExplainableScorer {
    pub fn new(weights: RankWeights) -> Self {
        Self { weights }
    }

    pub fn set_weights(&mut self, weights: RankWeights) {
        self.weights = weights;
    }

    pub fn explain(&self, result: &SearchResult) -> ScoringExplanation {
        let mut factors = Vec::new();

        let breakdown = &result.score_breakdown;
        let w = &self.weights;

        factors.push(ScoringFactor {
            name: "Text Match".to_string(),
            value: breakdown.text_match,
            weight: w.text_match,
            contribution: breakdown.text_match * w.text_match,
            explanation: format!(
                "Query terms found {} times in title and content",
                (breakdown.text_match * 10.0) as i32
            ),
        });

        // Stars factor
        factors.push(ScoringFactor {
            name: "Popularity".to_string(),
            value: breakdown.popularity,
            weight: w.popularity,
            contribution: breakdown.popularity * w.popularity,
            explanation: format!(
                "Stars+forks signal reputation ({}★, {} forks)",
                result.stars.unwrap_or(0),
                result.forks.unwrap_or(0)
            ),
        });

        // Recency factor
        factors.push(ScoringFactor {
            name: "Recency".to_string(),
            value: breakdown.commit_recency,
            weight: w.commit_recency,
            contribution: breakdown.commit_recency * w.commit_recency,
            explanation: match breakdown.commit_recency / 8.0 {
                x if x > 0.8 => "Recently updated (within ~30 days)".to_string(),
                x if x > 0.5 => "Updated in the last 6 months".to_string(),
                _ => "Older content (stale >6 months)".to_string(),
            },
        });

        factors.push(ScoringFactor {
            name: "Code Quality".to_string(),
            value: breakdown.readability,
            weight: w.readability,
            contribution: breakdown.readability * w.readability,
            explanation: if breakdown.readability > 3.0 {
                "High quality code with good documentation".to_string()
            } else if breakdown.readability > 1.5 {
                "Average code quality".to_string()
            } else {
                "Basic implementation".to_string()
            },
        });

        factors.push(ScoringFactor {
            name: "BM25 Boost".to_string(),
            value: breakdown.bm25,
            weight: w.bm25,
            contribution: breakdown.bm25 * w.bm25,
            explanation: "Term frequency in snippet after normalization (BM25)".to_string(),
        });

        factors.push(ScoringFactor {
            name: "Identifier Split".to_string(),
            value: breakdown.identifier,
            weight: w.identifier,
            contribution: breakdown.identifier * w.identifier,
            explanation: "CamelCase/snake_case pieces matched the query".to_string(),
        });

        if breakdown.language_affinity > 0.0 {
            factors.push(ScoringFactor {
                name: "Language Affinity".to_string(),
                value: breakdown.language_affinity,
                weight: w.language_affinity,
                contribution: breakdown.language_affinity * w.language_affinity,
                explanation: "Query language matched the file language".to_string(),
            });
        }

        // Rarity factor
        if breakdown.rarity > 0.0 {
            factors.push(ScoringFactor {
                name: "Uniqueness".to_string(),
                value: breakdown.rarity,
                weight: w.rarity,
                contribution: breakdown.rarity * w.rarity,
                explanation: "Contains rare or specialized terms".to_string(),
            });
        }

        ScoringExplanation {
            result_url: result.url.clone(),
            total_score: result.score,
            factors,
        }
    }

    // Generate human-readable explanation
    pub fn to_text(&self, explanation: &ScoringExplanation) -> String {
        let mut text = format!("Score: {:.2}\n\n", explanation.total_score);
        text.push_str("Ranking factors:\n");

        for factor in &explanation.factors {
            text.push_str(&format!(
                "• {} ({:.0}%): {}\n  Contribution: {:.2} points\n",
                factor.name,
                factor.weight * 100.0,
                factor.explanation,
                factor.contribution
            ));
        }

        text
    }
}
