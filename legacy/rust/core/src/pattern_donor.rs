use crate::{GitHubSearchClient, Result, SearchCategory, SearchRequest, SearchResult};
use serde::{Deserialize, Serialize};

/// Pattern Donor Engine
/// Identifies repositories that act as "donors" of structure, logic, or configuration patterns.
/// These are typically samples, boilerplate, templates, or community-standard configurations.
pub struct PatternDonorEngine {
    pub donor_identifiers: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DonorMatch {
    pub repository: String,
    pub score: f64,
    pub pattern_type: String,
}

impl PatternDonorEngine {
    pub fn new() -> Self {
        Self {
            donor_identifiers: vec![
                "sample".to_string(),
                "boilerplate".to_string(),
                "template".to_string(),
                "framework".to_string(),
                "starter".to_string(),
                "example".to_string(),
                "dayz-samples".to_string(),
                "config-samples".to_string(),
                "pattern-donor".to_string(),
                "seed-repo".to_string(),
                "awesome-".to_string(),
            ],
        }
    }

    /// Evaluates if a search result represents a potential pattern donor
    pub fn evaluate_result(&self, result: &SearchResult) -> f64 {
        let mut score = 0.0;
        let text = format!(
            "{} {}",
            result.title,
            result.subtitle.as_deref().unwrap_or("")
        )
        .to_lowercase();

        for id in &self.donor_identifiers {
            if text.contains(id) {
                score += 20.0;
            }
        }

        // Boost for specific structured repositories
        if result.repository.contains("awesome") || result.repository.contains("standard") {
            score += 15.0;
        }

        score
    }

    /// Recursively discovers new donors based on current findings
    pub async fn harvest_donors(
        &self,
        client: &GitHubSearchClient,
        query: &str,
    ) -> Result<Vec<SearchResult>> {
        tracing::info!(query = %query, "HARVESTER: Searching for pattern donors");

        let donor_query = format!("{} (sample OR template OR boilerplate OR examples)", query);
        let request = SearchRequest {
            query: donor_query,
            categories: vec![SearchCategory::Repositories],
            per_page: 5,
            raw: true,
            smart: false,
            recursive: false,
            experimental: false,
        };

        let mut results = client.execute_search_internal(&request).await?;
        for result in &mut results {
            result.is_emergent = true;
            result.score += 25.0; // Emergent boost
            result.evaluation = Some("PATTERN_DONOR_EXTRACTED".to_string());
        }

        Ok(results)
    }
}

impl Default for PatternDonorEngine {
    fn default() -> Self {
        Self::new()
    }
}
