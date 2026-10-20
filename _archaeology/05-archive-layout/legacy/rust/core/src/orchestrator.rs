use crate::{GitHubSearchClient, Result, SearchCategory, SearchRequest, SearchResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UnifiedSearchArgs {
    pub query: String,
    pub categories: Option<Vec<String>>,
    pub per_page: Option<u32>,
    pub raw: Option<bool>,
    pub smart: Option<bool>,
    pub recursive: Option<bool>,
    pub experimental: Option<bool>,
}

pub async fn execute_unified_search(
    client: &GitHubSearchClient,
    args: UnifiedSearchArgs,
) -> Result<Vec<SearchResult>> {
    // PERFORMANCE TIERS:
    // - Configurable safety timeout (safety stopgap)
    // - <3s: Target for typical searches (optimization goal)
    // - <1s: Ideal for cached/simple queries (fast path)
    let safety_timeout = client.safety_timeout();
    // PERFORMANCE: 800ms per-query timeout for <3s total target
    let _timeout_duration = std::time::Duration::from_millis(800);

    match tokio::time::timeout(safety_timeout, execute_unified_search_inner(client, args)).await {
        Ok(result) => result,
        Err(_) => {
            tracing::warn!("SAFETY_TIMEOUT: Search exceeded safety timeout");
            Err(crate::SearchError::UnexpectedResponse {
                status: reqwest::StatusCode::REQUEST_TIMEOUT,
                body: format!(
                    "Search exceeded safety timeout ({} ms)",
                    safety_timeout.as_millis()
                ),
            })
        }
    }
}

async fn execute_unified_search_inner(
    client: &GitHubSearchClient,
    args: UnifiedSearchArgs,
) -> Result<Vec<SearchResult>> {
    let query = args.query.trim().to_string();
    let is_raw = args.raw.unwrap_or(false);

    tracing::info!(
        query = %query,
        raw = is_raw,
        smart = args.smart.unwrap_or(true),
        recursive = args.recursive.unwrap_or(true),
        "Executing unified search"
    );

    let categories = if let Some(cats) = args.categories {
        cats.into_iter()
            .filter_map(|c| match c.to_lowercase().as_str() {
                "repositories" | "repo" | "repos" => Some(SearchCategory::Repositories),
                "code" => Some(SearchCategory::Code),
                "issues" | "issue" => Some(SearchCategory::Issues),
                "users" | "user" => Some(SearchCategory::Users),
                "pull_requests" | "pr" | "pulls" => Some(SearchCategory::PullRequests),
                "unified" => Some(SearchCategory::Unified),
                "commits" | "commit" => Some(SearchCategory::Commits),
                "topics" | "topic" => Some(SearchCategory::Topics),
                _ => None,
            })
            .collect::<Vec<_>>()
    } else {
        vec![]
    };

    let categories = if categories.is_empty() {
        SearchCategory::defaults()
    } else {
        categories
    };

    let request = SearchRequest {
        query: query.clone(),
        categories,
        per_page: args.per_page.unwrap_or(10),
        raw: is_raw,
        smart: if is_raw {
            false
        } else {
            args.smart.unwrap_or(true)
        },
        recursive: if is_raw {
            false
        } else {
            args.recursive.unwrap_or(true)
        },
        experimental: if is_raw {
            false
        } else {
            args.experimental.unwrap_or(false)
        },
    };

    tracing::info!(
        target: "hb-gh-search-orch",
        query = %request.query,
        categories = ?request.categories,
        raw = request.raw,
        "ORCHESTRATOR_READY: Dispatching search request"
    );

    let results = if is_raw {
        tracing::debug!(target: "hb-gh-search-orch", "BYPASS: Routing to internal raw search");
        client.execute_search_internal(&request).await
    } else {
        tracing::debug!(target: "hb-gh-search-orch", "HYPERBRUT: Routing to UnifiedEngine");
        client.search(request).await
    };

    if let Ok(ref res) = results {
        tracing::info!(
            target: "hb-gh-search-orch",
            count = res.len(),
            "ORCHESTRATOR_COMPLETE: Search yielded results"
        );
    }

    results
}
