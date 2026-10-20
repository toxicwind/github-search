// Query Decomposition Engine
// Automatically splits multi-term queries into pairwise combinations for better coverage

use itertools::Itertools;

pub struct QueryDecomposer;

impl QueryDecomposer {
    /// Decompose a query into pairwise combinations using itertools
    /// Example: "gvt1.com antigravity tar.gz" ->
    ///   ["gvt1.com antigravity", "antigravity tar.gz", "gvt1.com tar.gz"]
    pub fn decompose(query: &str) -> Vec<String> {
        // Regex to match quoted strings or non-whitespace sequences
        let re = regex::Regex::new(r#"[^\s"]+|"([^"]*)""#).unwrap();
        let terms: Vec<String> = re
            .find_iter(query)
            .map(|m| m.as_str().to_string())
            .collect();

        if terms.len() < 2 {
            return vec![query.to_string()];
        }

        let mut combinations = Vec::new();

        // Add original query
        combinations.push(query.to_string());

        // Generate all pairwise combinations using itertools
        for pair in terms.iter().combinations(2) {
            let combined = format!("{} {}", pair[0], pair[1]);
            combinations.push(combined);
        }

        combinations
    }

    /// Decompose with priority scoring
    /// Returns (query, priority_score) where higher score = more important
    pub fn decompose_with_priority(query: &str) -> Vec<(String, f64)> {
        // Regex to match quoted strings or non-whitespace sequences
        let re = regex::Regex::new(r#"[^\s"]+|"([^"]*)""#).unwrap();
        let terms: Vec<String> = re
            .find_iter(query)
            .map(|m| m.as_str().to_string())
            .collect();

        if terms.len() < 2 {
            return vec![(query.to_string(), 1.0)];
        }

        let mut combinations = Vec::new();

        // Original query has highest priority
        combinations.push((query.to_string(), 1.0));

        // Individual quoted terms (High Priority - Anchors)
        for term in &terms {
            if term.starts_with('"') {
                combinations.push((term.clone(), 0.9));
            }
        }

        // Sequential pairs (high priority - likely related)
        // Using itertools tuple_windows for sliding window
        for window in terms.iter().tuple_windows::<(_, _)>() {
            let sequential = format!("{} {}", window.0, window.1);
            combinations.push((sequential, 0.8));
        }

        // All other pairwise combinations (medium priority)
        for pair in terms.iter().combinations(2) {
            let combined = format!("{} {}", pair[0], pair[1]);
            // Skip if already added as sequential
            if !combinations.iter().any(|(q, _)| q == &combined) {
                combinations.push((combined, 0.6));
            }
        }

        // Individual terms (lowest priority - fallback)
        for term in &terms {
            if !term.starts_with('"') && term.len() > 3 {
                // Skip very short terms and already-handled quoted terms
                combinations.push((term.to_string(), 0.3));
            }
        }

        combinations
    }

    /// Smart decomposition that avoids redundant queries
    pub fn smart_decompose(query: &str, max_queries: usize) -> Vec<String> {
        let mut combinations = Self::decompose_with_priority(query);

        // Sort by priority (descending)
        combinations.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        // Take top N
        combinations
            .into_iter()
            .take(max_queries)
            .map(|(q, _)| q)
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decompose_three_terms() {
        let result = QueryDecomposer::decompose("gvt1.com antigravity tar.gz");

        assert!(result.contains(&"gvt1.com antigravity tar.gz".to_string()));
        assert!(result.contains(&"gvt1.com antigravity".to_string()));
        assert!(result.contains(&"antigravity tar.gz".to_string()));
        assert!(result.contains(&"gvt1.com tar.gz".to_string()));
    }

    #[test]
    fn test_decompose_two_terms() {
        let result = QueryDecomposer::decompose("rust async");

        assert_eq!(result.len(), 2); // Original + one pair
        assert!(result.contains(&"rust async".to_string()));
    }

    #[test]
    fn test_smart_decompose_limits() {
        let result = QueryDecomposer::smart_decompose("a b c d e", 3);

        assert_eq!(result.len(), 3);
        assert_eq!(result[0], "a b c d e"); // Original first
    }

    #[test]
    fn test_sequential_pairs() {
        let result = QueryDecomposer::decompose_with_priority("one two three");

        // Should have sequential pairs with high priority
        let sequential: Vec<_> = result
            .iter()
            .filter(|(_, p)| *p == 0.8)
            .map(|(q, _)| q.clone())
            .collect();

        assert!(sequential.contains(&"one two".to_string()));
        assert!(sequential.contains(&"two three".to_string()));
    }

    #[test]
    fn test_dumb_query_prioritization() {
        let query =
            r#""player_id" "console_id" "leaderboard" "tracking" python discord bot game server"#;
        // Should prioritize quoted terms (0.9) over pairs (0.8/0.6)

        let result = QueryDecomposer::smart_decompose(query, 6);

        // 1. Original (1.0)
        assert_eq!(result[0], query);

        // 2-5: Should be the quoted terms (0.9)
        // Order within same priority is stable if sorted, but let's check containment
        let top_5 = &result[1..5];
        assert!(top_5.contains(&r#""player_id""#.to_string()));
        assert!(top_5.contains(&r#""console_id""#.to_string()));
        assert!(top_5.contains(&r#""leaderboard""#.to_string()));

        // Ensure "tracking" python (pair) is lower priority than "tracking" (quoted)
        // Pairs are 0.8 max. Quoted is 0.9.
    }
}
