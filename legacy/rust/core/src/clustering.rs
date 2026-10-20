use crate::{SearchCategory, SearchResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cluster {
    pub name: String,
    pub count: usize,
    pub score_sum: f64,
    pub items: Vec<SearchResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusteredResults {
    pub by_language: Vec<Cluster>,
    pub by_category: Vec<Cluster>,
    pub by_repo: Vec<Cluster>,
}

pub fn cluster_results(results: Vec<SearchResult>) -> ClusteredResults {
    let mut by_language: HashMap<String, Cluster> = HashMap::new();
    let mut by_category: HashMap<String, Cluster> = HashMap::new();
    let mut by_repo: HashMap<String, Cluster> = HashMap::new();

    for item in results {
        // By Category
        let cat_key = match item.category {
            SearchCategory::Repositories => "Repositories",
            SearchCategory::Code => "Code",
            SearchCategory::Issues => "Issues",
            SearchCategory::PullRequests => "Pull Requests",
            SearchCategory::Users => "Users",
            SearchCategory::Discussions => "Discussions",
            SearchCategory::Commits => "Commits",
            SearchCategory::Packages => "Packages",
            SearchCategory::Wikis => "Wikis",
            SearchCategory::Topics => "Topics",
            SearchCategory::Marketplace => "Marketplace",
            SearchCategory::Unified => "Unified",
        }
        .to_string();

        add_to_cluster(&mut by_category, cat_key, item.clone());

        // By Language (if applicable)
        if let Some(lang) = &item.language {
            add_to_cluster(&mut by_language, lang.clone(), item.clone());
        }

        // By Repo
        if !item.repository.is_empty() {
            add_to_cluster(&mut by_repo, item.repository.clone(), item.clone());
        }
    }

    ClusteredResults {
        by_language: sort_clusters(by_language),
        by_category: sort_clusters(by_category),
        by_repo: sort_clusters(by_repo),
    }
}

fn add_to_cluster(map: &mut HashMap<String, Cluster>, key: String, item: SearchResult) {
    let entry = map.entry(key.clone()).or_insert(Cluster {
        name: key,
        count: 0,
        score_sum: 0.0,
        items: Vec::new(),
    });
    entry.count += 1;
    entry.score_sum += item.score;
    // Limit items per cluster to avoid huge duplication?
    // For now keep all.
    entry.items.push(item);
}

fn sort_clusters(map: HashMap<String, Cluster>) -> Vec<Cluster> {
    let mut clusters: Vec<Cluster> = map.into_values().collect();
    // Sort by count desc, then score sum desc
    clusters.sort_by(|a, b| {
        b.count.cmp(&a.count).then_with(|| {
            b.score_sum
                .partial_cmp(&a.score_sum)
                .unwrap_or(std::cmp::Ordering::Equal)
        })
    });
    clusters
}
