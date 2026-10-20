// Cycle 9: Collaborative Filtering
// Beyond-baseline: Recommend queries based on what similar users searched

use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub struct User {
    pub id: String,
}

#[derive(Debug, Clone)]
pub struct SearchSession {
    pub user: User,
    pub queries: Vec<String>,
    pub clicked_results: Vec<String>,
}

pub struct CollaborativeFilter {
    sessions: Vec<SearchSession>,
    user_similarity_cache: HashMap<(String, String), f64>,
}

impl CollaborativeFilter {
    pub fn new() -> Self {
        Self {
            sessions: Vec::new(),
            user_similarity_cache: HashMap::new(),
        }
    }

    pub fn record_session(&mut self, session: SearchSession) {
        self.sessions.push(session);
        // Invalidate similarity cache
        self.user_similarity_cache.clear();
    }

    // Compute Jaccard similarity between two users
    fn user_similarity(&mut self, user_a: &str, user_b: &str) -> f64 {
        let cache_key = if user_a < user_b {
            (user_a.to_string(), user_b.to_string())
        } else {
            (user_b.to_string(), user_a.to_string())
        };

        if let Some(&sim) = self.user_similarity_cache.get(&cache_key) {
            return sim;
        }

        let queries_a: HashSet<_> = self.sessions
            .iter()
            .filter(|s| s.user.id == user_a)
            .flat_map(|s| s.queries.clone())
            .collect();

        let queries_b: HashSet<_> = self.sessions
            .iter()
            .filter(|s| s.user.id == user_b)
            .flat_map(|s| s.queries.clone())
            .collect();

        let intersection = queries_a.intersection(&queries_b).count();
        let union = queries_a.union(&queries_b).count();

        let similarity = if union > 0 {
            intersection as f64 / union as f64
        } else {
            0.0
        };

        self.user_similarity_cache.insert(cache_key, similarity);
        similarity
    }

    // Recommend queries for a user based on similar users
    pub fn recommend_queries(&mut self, user_id: &str, top_n: usize) -> Vec<String> {
        let all_users: HashSet<String> = self.sessions
            .iter()
            .map(|s| s.user.id.clone())
            .collect();

        // Find similar users
        let mut similarities: Vec<(String, f64)> = all_users
            .iter()
            .filter(|u| *u != user_id)
            .map(|u| (u.clone(), self.user_similarity(user_id, u)))
            .collect();

        similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        // Get queries from top similar users
        let similar_users: Vec<String> = similarities
            .iter()
            .take(5)
            .map(|(u, _)| u.clone())
            .collect();

        let user_queries: HashSet<String> = self.sessions
            .iter()
            .filter(|s| s.user.id == user_id)
            .flat_map(|s| s.queries.clone())
            .collect();

        let mut recommended_queries: HashMap<String, f64> = HashMap::new();

        for similar_user in similar_users {
            let sim_score = self.user_similarity(user_id, &similar_user);
            
            for session in &self.sessions {
                if session.user.id == similar_user {
                    for query in &session.queries {
                        if !user_queries.contains(query) {
                            *recommended_queries.entry(query.clone()).or_insert(0.0) += sim_score;
                        }
                    }
                }
            }
        }

        let mut recommendations: Vec<(String, f64)> = recommended_queries.into_iter().collect();
        recommendations.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        recommendations
            .into_iter()
            .take(top_n)
            .map(|(q, _)| q)
            .collect()
    }
}
