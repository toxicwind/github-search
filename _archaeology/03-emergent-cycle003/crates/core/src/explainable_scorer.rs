// Cycle 10: Explainable AI Scoring
// Beyond-baseline: Provide explanations for why results were ranked

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
    // Configuration
}

impl ExplainableScorer {
    pub fn new() -> Self {
        Self {}
    }

    pub fn explain(&self, result: &SearchResult) -> ScoringExplanation {
        let mut factors = Vec::new();

        // Text match factor
        let breakdown = &result.score_breakdown;
        
        factors.push(ScoringFactor {
            name: "Text Match".to_string(),
            value: breakdown.text_match,
            weight: 0.3,
            contribution: breakdown.text_match * 0.3,
            explanation: format!(
                "Query terms found {} times in title and content",
                (breakdown.text_match * 10.0) as i32
            ),
        });

        // Stars factor
        factors.push(ScoringFactor {
            name: "Popularity".to_string(),
            value: breakdown.stars,
            weight: 0.2,
            contribution: breakdown.stars * 0.2,
            explanation: format!(
                "Repository has {} stars, indicating community trust",
                result.stars.unwrap_or(0)
            ),
        });

        // Recency factor
        factors.push(ScoringFactor {
            name: "Recency".to_string(),
            value: breakdown.recency,
            weight: 0.15,
            contribution: breakdown.recency * 0.15,
            explanation: if breakdown.recency > 0.8 {
                "Recently updated (within last month)".to_string()
            } else if breakdown.recency > 0.5 {
                "Moderately recent (within last 6 months)".to_string()
            } else {
                "Older repository (over 6 months since update)".to_string()
            },
        });

        // Readability factor
        factors.push(ScoringFactor {
            name: "Code Quality".to_string(),
            value: breakdown.readability,
            weight: 0.2,
            contribution: breakdown.readability * 0.2,
            explanation: if breakdown.readability > 3.0 {
                "High quality code with good documentation".to_string()
            } else if breakdown.readability > 1.5 {
                "Average code quality".to_string()
            } else {
                "Basic implementation".to_string()
            },
        });

        // Rarity factor
        if breakdown.rarity > 0.0 {
            factors.push(ScoringFactor {
                name: "Uniqueness".to_string(),
                value: breakdown.rarity,
                weight: 0.15,
                contribution: breakdown.rarity * 0.15,
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
