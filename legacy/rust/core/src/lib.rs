pub mod adversarial;
pub mod clustering;
pub mod code_graph;
pub mod collaborative_filter;
pub mod context_awareness;
pub mod dependency_graph;
pub mod explainable_scorer;
pub mod fracture;
pub mod genesis;
pub mod ghost_log;
pub mod incremental_cache;
pub mod llm;
pub mod ml_ranker;
pub mod multimodal_fusion;
pub mod orchestrator;
pub mod pattern_donor;
pub mod query_decomposer;
pub mod query_mutator;
pub mod ranking;
pub mod rate_limiter;
pub mod regex_expander;
pub mod regex_filter;
pub mod self_improver;
pub mod semantic;
pub mod semantic_scoring;
pub mod syntax;
pub mod temporal_analyzer;
pub mod unified_engine;

pub use self_improver::{
    AcceptanceDecision, MetricEntry, MetricsSnapshot, NoveltyDescriptor, SelfImprover,
    SelfImproverError, SelfImproverState, VariantBrief, VariantRecord, DEFAULT_NOVELTY_THRESHOLD,
    LINEAGE_LOG, METRICS_DIR,
};

pub use clustering::{cluster_results, Cluster, ClusteredResults};
pub use llm::LlmClient;
pub use ranking::RankWeights;
pub use regex_expander::{contains_regex_pattern, expand_pattern, extract_regex_pattern};

use std::{
    cmp::Ordering,
    sync::Arc,
    time::{Duration, Instant},
};

use chrono::{DateTime, Utc};
use futures::future::{join_all, BoxFuture};
use futures::FutureExt;
use gh_search_cache::DiskCache;
use moka::future::Cache as AsyncCache;
use reqwest::{header, Client, StatusCode};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use thiserror::Error;
use tokio::time::sleep;
use tracing::instrument;
use urlencoding::encode;

pub mod config;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SearchCategory {
    Repositories,
    Code,
    Issues,
    PullRequests,
    Users,
    Discussions,
    Commits,
    Packages,
    Wikis,
    Topics,
    Marketplace,
    Unified,
}

impl SearchCategory {
    // ... items ...
    pub fn defaults() -> Vec<Self> {
        vec![Self::Unified]
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq, Hash)]
pub struct SearchRequest {
    pub query: String,
    pub categories: Vec<SearchCategory>,
    pub per_page: u32,
    /// When true, skip custom scoring and return GitHub API order as-is
    #[serde(default)]
    pub raw: bool,
    /// Enable smart context-aware discovery and ranking
    #[serde(default)]
    pub smart: bool,
    /// Enable swarm fallback + recursive discovery when GitHub returns zero matches
    #[serde(default)]
    pub recursive: bool,
    /// Toggle the experimental heuristic-heavy ranking path.
    #[serde(default)]
    pub experimental: bool,
}

impl SearchRequest {
    pub fn normalized_categories(&self) -> Vec<SearchCategory> {
        let mut unique: std::collections::HashSet<_> = self.categories.iter().cloned().collect();
        if unique.contains(&SearchCategory::Unified) {
            unique.remove(&SearchCategory::Unified);
            unique.insert(SearchCategory::Repositories);
            unique.insert(SearchCategory::Code);
            unique.insert(SearchCategory::Issues);
            unique.insert(SearchCategory::PullRequests);
            unique.insert(SearchCategory::Commits);
            unique.insert(SearchCategory::Discussions);
        }

        // HYPEBRUT OPTIMIZATION: If query contains qualifiers only supported by Code search,
        // prune other categories to avoid API errors.
        if self.query.contains("path:")
            || self.query.contains("symbol:")
            || self.query.contains("content:")
            || self.query.contains("extension:")
        {
            tracing::debug!("Qualifier-based pruning: restricting search to Code category");
            return vec![SearchCategory::Code];
        }

        unique.into_iter().collect()
    }
}

/// Number of scoring features tracked in `ScoreBreakdown`.
pub const FEATURE_DIM: usize = 14;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ScoreBreakdown {
    pub base: f64,
    pub stars: f64,
    pub recency: f64,
    pub text_match: f64,
    pub readability: f64,
    pub fusion: f64,
    pub context: f64,
    pub rarity: f64,
    /// BM25-style boost computed from snippets and identifiers.
    pub bm25: f64,
    /// Matches found after splitting CamelCase/snake_case identifiers.
    pub identifier: f64,
    /// Combined community signals (stars, forks) scaled for ranking.
    pub popularity: f64,
    /// Affinity boost when query language matches result language.
    pub language_affinity: f64,
    /// Time-decayed bonus based on the most recent commit/update.
    pub commit_recency: f64,
    /// ML ranking contribution from the learning-to-rank model.
    pub ml: f64,
    /// Semantic similarity score from embedding-based matching.
    pub semantic: f64,
}

impl ScoreBreakdown {
    pub fn total(&self) -> f64 {
        // Baseline sum retains legacy behaviour while routing through the weight vector.
        self.weighted_total(&RankWeights::baseline())
    }

    pub fn weighted_total(&self, weights: &RankWeights) -> f64 {
        let features = self.feature_vector();
        let weights_vec = weights.as_vector();
        let raw: f64 = features
            .iter()
            .zip(weights_vec.iter())
            .map(|(f, w)| f * w)
            .sum();
        raw.clamp(0.0, 100.0)
    }

    pub fn feature_vector(&self) -> [f64; FEATURE_DIM] {
        [
            self.base,
            self.stars,
            self.recency,
            self.text_match,
            self.readability,
            self.fusion,
            self.context,
            self.rarity,
            self.bm25,
            self.identifier,
            self.popularity,
            self.language_affinity,
            self.commit_recency,
            self.ml,
        ]
    }
}

impl Default for ScoreBreakdown {
    fn default() -> Self {
        Self {
            base: 0.0,
            stars: 0.0,
            recency: 0.0,
            text_match: 0.0,
            readability: 0.0,
            fusion: 0.0,
            context: 0.0,
            rarity: 0.0,
            bm25: 0.0,
            identifier: 0.0,
            popularity: 0.0,
            language_affinity: 0.0,
            commit_recency: 0.0,
            ml: 0.0,
            semantic: 0.0,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub category: SearchCategory,
    pub title: String,
    pub subtitle: Option<String>,
    pub url: String,
    /// Direct raw URL for code blobs (raw.githubusercontent.com). None for non-code results.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub raw_url: Option<String>,
    pub repository: String,
    pub path: Option<String>,
    pub stars: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub forks: Option<u64>,
    pub language: Option<String>,
    pub updated_at: Option<DateTime<Utc>>,
    pub score: f64,
    pub score_breakdown: ScoreBreakdown,
    pub snippet: Option<String>,
    pub highlights: Vec<String>,
    #[serde(default)]
    pub is_emergent: bool,
    #[serde(default)]
    pub evaluation: Option<String>,
    #[serde(default)]
    pub latent_score: Option<f64>,
}

impl SearchResult {
    pub fn by_score_desc(a: &SearchResult, b: &SearchResult) -> Ordering {
        b.score.partial_cmp(&a.score).unwrap_or(Ordering::Equal)
    }
}

fn build_raw_url_from_html(html_url: &str) -> Option<String> {
    const PREFIX: &str = "https://github.com/";
    if !html_url.starts_with(PREFIX) {
        return None;
    }
    let remainder = &html_url[PREFIX.len()..];
    let parts: Vec<&str> = remainder.split('/').collect();
    if parts.len() < 5 || parts.get(2) != Some(&"blob") {
        return None;
    }
    let owner = parts[0];
    let repo = parts[1];
    let branch = parts[3];
    let path = parts[4..].join("/");
    Some(format!(
        "https://raw.githubusercontent.com/{}/{}/{}/{}",
        owner, repo, branch, path
    ))
}

fn build_head_raw_url(repo: &str, path: &str) -> String {
    format!("https://raw.githubusercontent.com/{}/HEAD/{}", repo, path)
}

fn build_rev_raw_url(repo: &str, rev: &str, path: &str) -> String {
    format!(
        "https://raw.githubusercontent.com/{}/{}/{}",
        repo, rev, path
    )
}

fn compute_raw_url(html_url: &str, repo: &str, path: &str, rev: Option<&str>) -> String {
    if let Some(r) = rev {
        return build_rev_raw_url(repo, r, path);
    }
    build_raw_url_from_html(html_url).unwrap_or_else(|| build_head_raw_url(repo, path))
}

#[derive(Error, Debug)]
pub enum SearchError {
    #[error("Invalid Authorization token")]
    InvalidToken,
    #[error("GitHub API Error: {status} - {body}")]
    UnexpectedResponse { status: StatusCode, body: String },
    #[error("HTTP Client Error: {0}")]
    Http(#[from] reqwest::Error),
}

pub type Result<T> = std::result::Result<T, SearchError>;
#[derive(Clone)]
pub struct GitHubSearchClient {
    http: Client,
    token: Option<String>,
    base_url: String,
    cache: Option<DiskCache>,
    content_mem: moka::future::Cache<String, std::sync::Arc<String>>,
    _llm: LlmClient,
    pub context: gh_search_context::LocalContext,
    queue: rate_limiter::SmartRequestQueue,
    pub unified_engine:
        std::sync::Arc<tokio::sync::Mutex<crate::unified_engine::UnifiedSearchEngine>>,
    safety_timeout: Duration,
}

#[derive(Debug, Deserialize, Serialize)]
struct RepositoryItem {
    full_name: String,
    description: Option<String>,
    html_url: String,
    stargazers_count: u64,
    #[serde(default)]
    forks_count: Option<u64>,
    language: Option<String>,
    updated_at: Option<String>,
    score: f64,
}

#[derive(Debug, Deserialize, Serialize)]
struct CodeItem {
    name: String,
    path: String,
    html_url: String,
    sha: Option<String>,
    repository: RepositoryRef,
    score: f64,
    #[serde(default)]
    text_matches: Option<Vec<TextMatch>>,
    #[serde(default)]
    language: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct RepositoryRef {
    full_name: String,
    #[serde(default)]
    stargazers_count: Option<u64>,
    #[serde(default)]
    forks_count: Option<u64>,
    #[serde(default)]
    updated_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct TextMatch {
    fragment: String,
    matches: Vec<TextMatchCapture>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct TextMatchCapture {
    text: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct IssueItem {
    html_url: String,
    title: String,
    user: UserItem,
    state: String,
    comments: u64,
    created_at: String,
    updated_at: Option<String>,
    body: Option<String>,
    repository_url: String,
    number: u64,
    #[serde(default)]
    pub score: f64,
}

#[derive(Debug, Deserialize, Serialize)]
struct CommitItem {
    url: String,
    sha: String,
    html_url: String,
    commit: CommitDetails,
    author: Option<UserItem>,
    repository: RepositoryRef,
    #[serde(default)]
    score: f64,
}

#[derive(Debug, Deserialize, Serialize)]
struct CommitDetails {
    message: String,
    author: CommitAuthor,
}

#[derive(Debug, Deserialize, Serialize)]
struct CommitAuthor {
    name: String,
    date: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct TopicItem {
    name: String,
    display_name: Option<String>,
    description: Option<String>,
    released: Option<String>,
    created_at: String,
    updated_at: String,
    featured: bool,
    curated: bool,
    score: f64,
}

#[derive(Debug, Deserialize, Serialize)]
struct UserItem {
    login: String,
    html_url: String,
    #[serde(rename = "type")]
    r#type: String,
    #[serde(default)]
    score: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RepoTreeEntry {
    pub path: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub sha: String,
}

impl GitHubSearchClient {
    pub fn new(token: Option<String>) -> Self {
        let config = crate::config::Config::from_env();
        let token = token.or(config.github_token.clone());

        let http = Client::builder()
            .user_agent("hb-gh-search/0.1 (+https://github.com/hypebrut)")
            .timeout(Duration::from_secs(15))
            .build()
            .expect("failed to build http client");

        // Initialize cache with 1 day TTL
        let cache = DiskCache::new(1).ok();
        if cache.is_some() {
            tracing::info!("Disk cache initialized");
        } else {
            tracing::warn!("Failed to initialize disk cache");
        }

        // Initialize smart request queue
        let has_token = token.is_some();
        // Allow environment override via GH_SEARCH_MAX_CONCURRENT (Config.max_concurrent)
        let max_concurrent = if let Some(cfg_max) = config.max_concurrent {
            cfg_max
        } else if has_token {
            10
        } else {
            3
        };
        if config.max_concurrent.is_some() {
            tracing::info!("Overriding max_concurrent from env: {}", max_concurrent);
        }

        let queue = rate_limiter::SmartRequestQueue::new(has_token, max_concurrent);

        let content_mem = AsyncCache::builder()
            .max_capacity(2_000)
            .weigher(|_k, v: &Arc<String>| v.len() as u32)
            .build();

        Self {
            http,
            token,
            base_url: "https://api.github.com".to_string(),
            cache,
            content_mem,
            _llm: LlmClient::new(),
            context: gh_search_context::LocalContext::load(),
            queue,
            unified_engine: std::sync::Arc::new(tokio::sync::Mutex::new(
                crate::unified_engine::UnifiedSearchEngine::new(config.data_dir),
            )),
            safety_timeout: Duration::from_millis(config.safety_timeout_ms.max(1)),
        }
    }
    // ...

    pub fn with_base_url(mut self, base_url: impl Into<String>) -> Self {
        self.base_url = base_url.into();
        self
    }

    pub fn safety_timeout(&self) -> Duration {
        self.safety_timeout
    }

    #[instrument(name = "github_search", skip(self), fields(query = %request.query))]
    pub async fn search(&self, request: SearchRequest) -> Result<Vec<SearchResult>> {
        let mut engine = self.unified_engine.lock().await;
        engine.search(self, &request, "default_user").await
    }

    pub async fn execute_search_internal(
        &self,
        request: &SearchRequest,
    ) -> Result<Vec<SearchResult>> {
        let categories = request.normalized_categories();
        let per_page = request.per_page.clamp(1, 100);
        let query = request.query.trim().to_string();
        let raw_mode = request.raw;

        tracing::info!(
            target: "hb-gh-search",
            query = %query,
            categories = ?categories,
            per_page = per_page,
            raw = raw_mode,
            "INTERNAL_SEARCH_START: Spawning category tasks"
        );

        let tasks: Vec<BoxFuture<'_, Result<Vec<SearchResult>>>> = categories
            .iter()
            .map(|category| match category {
                SearchCategory::Repositories => self
                    .search_repositories(query.clone(), per_page, raw_mode)
                    .boxed(),
                SearchCategory::Code => self.search_code(query.clone(), per_page, raw_mode).boxed(),
                SearchCategory::Issues => self
                    .search_issues(query.clone(), per_page, false, raw_mode)
                    .boxed(),
                SearchCategory::PullRequests => self
                    .search_issues(query.clone(), per_page, true, raw_mode)
                    .boxed(),
                SearchCategory::Users => {
                    self.search_users(query.clone(), per_page, raw_mode).boxed()
                }
                SearchCategory::Commits => self
                    .search_commits(query.clone(), per_page, raw_mode)
                    .boxed(),
                SearchCategory::Topics => self
                    .search_topics(query.clone(), per_page, raw_mode)
                    .boxed(),
                SearchCategory::Discussions => self
                    .search_discussions(query.clone(), per_page, raw_mode)
                    .boxed(),
                // Fallback for any other categories (Packages, Wikis, Marketplace, Unified)
                _ => {
                    tracing::warn!("Search for category {:?} is not yet implemented", category);
                    std::future::ready(Ok(Vec::new())).boxed()
                }
            })
            .collect();

        let mut bucketed = Vec::new();
        for outcome in join_all(tasks).await {
            match outcome {
                Ok(res) => bucketed.push(res),
                Err(e) => {
                    // RESILIENCY: Log error but don't fail the whole search
                    tracing::error!(
                        target: "hb-gh-search",
                        error = %e,
                        "CATEGORY_FAILURE_SILENCED: A category search failed but we are proceeding"
                    );
                }
            }
        }

        tracing::info!(
            target: "hb-gh-search",
            buckets = bucketed.len(),
            "INTERNAL_SEARCH_DATA_GATHERED: Processing buckets"
        );

        let mut aggregated = Vec::new();
        for bucket in bucketed.into_iter() {
            for (rank, mut result) in bucket.into_iter().enumerate() {
                if !raw_mode {
                    // Apply fusion scoring only when not in raw mode
                    let fusion = 1.0 / (60.0 + rank as f64 + 1.0);
                    result.score_breakdown.fusion = fusion;
                }
                aggregated.push(result);
            }
        }

        // UNIFIED ENGINE INTEGRATION: Apply advanced scoring and filtering
        // AUTO SMART ANALYSIS: Use context analyzer if requested
        if request.smart {
            let smart_results = self
                .perform_smart_analysis(&aggregated, &crate::config::Config::from_env())
                .await;
            aggregated.extend(smart_results);
        }

        // VCYCLE 004: Derive repositories if direct repo results are thin
        let has_repos = aggregated
            .iter()
            .any(|r| r.category == SearchCategory::Repositories);
        if !has_repos {
            let derived = derive_repositories_from_results(&aggregated);
            aggregated.extend(derived);
        }

        if !raw_mode {
            let mut engine = self.unified_engine.lock().await;

            // Lightweight lexical overlap boost
            for res in &mut aggregated {
                let overlap = overlap_bonus(&query, res);
                res.score_breakdown.context = overlap;
            }

            // Experimental heuristics (BM25, identifier splits, popularity)
            let active_weights = if request.experimental {
                let weights = engine.rank_weights.clone();
                crate::ranking::apply_experimental_ranking(&mut aggregated, &query, &weights, None);
                engine.explainer.set_weights(weights.clone());
                weights
            } else {
                RankWeights::baseline()
            };

            // TF-IDF (Collection Frequency) Boosting
            let query_words: std::collections::HashSet<String> = query
                .to_lowercase()
                .split(|c: char| !c.is_alphanumeric())
                .filter(|s| s.len() > 2)
                .map(|s| s.to_string())
                .collect();

            let mut word_counts: std::collections::HashMap<String, usize> =
                std::collections::HashMap::new();
            for res in &aggregated {
                let text = format!(
                    "{} {} {}",
                    res.title,
                    res.subtitle.as_deref().unwrap_or(""),
                    res.snippet.as_deref().unwrap_or("")
                )
                .to_lowercase();
                for word in &query_words {
                    if text.contains(word) {
                        *word_counts.entry(word.clone()).or_insert(0) += 1;
                    }
                }
            }

            let total_docs = aggregated.len() as f64;
            if total_docs > 0.0 {
                for res in &mut aggregated {
                    let text = format!(
                        "{} {} {}",
                        res.title,
                        res.subtitle.as_deref().unwrap_or(""),
                        res.snippet.as_deref().unwrap_or("")
                    )
                    .to_lowercase();
                    let mut rarity_boost = 0.0;
                    for word in &query_words {
                        if text.contains(word) {
                            let doc_count = *word_counts.get(word).unwrap_or(&1) as f64;
                            // IDF-like weight: log(Total / DocCount)
                            let idf = (total_docs / doc_count).ln();
                            rarity_boost += idf;
                        }
                    }
                    res.score_breakdown.rarity = rarity_boost * 2.0; // Scale the boost
                }
            }

            // Temporal tracking
            engine
                .temporal
                .record_search(request.query.clone(), aggregated.len());

            // Final ML blend and clamp into 0-100 band
            for result in &mut aggregated {
                let recency_days = result
                    .updated_at
                    .map(|dt| (Utc::now() - dt).num_days().max(0) as f64)
                    .unwrap_or(365.0);
                let features = crate::ml_ranker::RankingFeatures {
                    text_match_score: result.score_breakdown.text_match,
                    stars: result.stars.unwrap_or(0) as f64,
                    recency_days,
                    code_quality: result.score_breakdown.readability,
                    community_engagement: result.score_breakdown.popularity.max(0.5),
                    bm25: result.score_breakdown.bm25,
                    identifier_score: result.score_breakdown.identifier,
                    language_affinity: result.score_breakdown.language_affinity,
                    popularity: result.score_breakdown.popularity,
                    commit_recency: result.score_breakdown.commit_recency,
                };
                let base_score = if request.experimental {
                    result.score_breakdown.weighted_total(&active_weights)
                } else {
                    result.score_breakdown.total()
                };
                let ml_score = engine.ranker.rank_with_ltr(&features);
                result.score_breakdown.ml = ml_score; // Store ML contribution for visibility
                result.score = (base_score * 0.7 + ml_score * 0.3).clamp(0.0, 100.0);
            }

            aggregated.sort_by(SearchResult::by_score_desc);
        }
        Ok(aggregated)
    }

    /// Perform smart analysis to find connected files (migrated from API server)
    pub async fn perform_smart_analysis(
        &self,
        results: &[SearchResult],
        config: &crate::config::Config,
    ) -> Vec<SearchResult> {
        tracing::info!("Smart mode active - Analyzing connected files...");
        let mut additional_results = Vec::new();

        // Limit smart analysis to top 5 results to avoid explosion
        let targets = results.iter().take(5);

        for result in targets {
            if result.category == SearchCategory::Code {
                if let (Some(path), repo) = (&result.path, &result.repository) {
                    tracing::info!(repo = %repo, path = %path, "Analyzing connections for file");
                    match self.fetch_file_content(repo, path).await {
                        Ok(content) => {
                            // Use ContextAnalyzer from gh_search_context
                            let connections =
                                gh_search_context::ContextAnalyzer::find_connected_files(
                                    &content,
                                    path,
                                    result.language.as_deref(),
                                );
                            if !connections.is_empty() {
                                tracing::info!(
                                    "Found {} connection(s) in {}",
                                    connections.len(),
                                    path
                                );
                                for connected_path in connections {
                                    let dir = std::path::Path::new(path)
                                        .parent()
                                        .unwrap_or(std::path::Path::new(""));
                                    let resolved =
                                        dir.join(&connected_path).to_string_lossy().to_string();

                                    match self.fetch_file_content(repo, &resolved).await {
                                        Ok(conn_content) => {
                                            let _snippet = conn_content
                                                .chars()
                                                .take(config.snippet_length)
                                                .collect::<String>();
                                            let new_url = format!(
                                                "https://github.com/{}/blob/HEAD/{}",
                                                repo, resolved
                                            );
                                            let raw_url = build_head_raw_url(repo, &resolved);

                                            additional_results.push(SearchResult {
                                                category: SearchCategory::Code,
                                                title: format!("{} 🔗", connected_path),
                                                subtitle: Some(format!("Linked from {}", path)),
                                                url: new_url,
                                                raw_url: Some(raw_url),
                                                repository: repo.clone(),
                                                path: Some(resolved),
                                                stars: None,
                                                forks: None,
                                                language: None,
                                                updated_at: None,
                                                score: result.score * 0.8,
                                                score_breakdown: result.score_breakdown.clone(),
                                                snippet: Some(_snippet),
                                                highlights: vec![],
                                                is_emergent: false,
                                                evaluation: Some("SMART_CONTEXT".to_string()),
                                                latent_score: None,
                                            });
                                        }
                                        Err(e) => {
                                            tracing::debug!(
                                                "Could not resolve connected file {}: {}",
                                                resolved,
                                                e
                                            );
                                        }
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            tracing::error!("Failed to fetch content for analysis: {}", e);
                        }
                    }
                }
            }
        }
        additional_results
    }

    async fn _swarm_discovery(&self, request: &SearchRequest) -> Result<Vec<SearchResult>> {
        // SMART QUERY DECOMPOSITION: Split multi-term queries into pairwise combinations
        // Example: "gvt1.com antigravity tar.gz" -> ["gvt1.com antigravity", "antigravity tar.gz", "gvt1.com tar.gz"]
        let decomposed_queries = if request.smart {
            crate::query_decomposer::QueryDecomposer::smart_decompose(&request.query, 5)
        } else {
            vec![request.query.clone()]
        };

        tracing::info!(
            "Query decomposition: {} -> {} sub-queries",
            request.query,
            decomposed_queries.len()
        );

        let mut atoms: Vec<String> = request
            .query
            .split(|c: char| c.is_whitespace() || c == '/')
            .filter(|token| token.len() > 2)
            .map(|token| {
                token
                    .trim_matches(|ch| ch == '"' || ch == '\'' || ch == '+')
                    .to_string()
            })
            .collect();

        // Add decomposed queries to atoms for broader coverage
        for decomposed in decomposed_queries {
            if !atoms.contains(&decomposed) && decomposed.len() > 2 {
                atoms.push(decomposed);
            }
        }

        // Initialize Triple-Hybrid Engine
        let hybrid_engine = crate::regex_filter::TripleHybridEngine::new(&request.query);

        // (Existing expansion logic remains to populate atoms...)
        if let Some((prefix, pattern, suffix)) =
            crate::regex_expander::extract_regex_pattern(&request.query)
        {
            for expansion in crate::regex_expander::expand_pattern(&pattern) {
                let mut combined = String::new();
                if !prefix.trim().is_empty() {
                    combined.push_str(prefix.trim());
                    combined.push(' ');
                }
                combined.push_str(expansion.trim());
                if !suffix.trim().is_empty() {
                    combined.push(' ');
                    combined.push_str(suffix.trim());
                }
                let candidate = combined.trim().to_string();
                if candidate.len() > 2 {
                    atoms.push(candidate);
                }
            }
        }

        atoms.sort();
        atoms.dedup();
        if atoms.is_empty() {
            return Ok(Vec::new());
        }

        use futures::StreamExt;

        // 10x SCALABLE SWARM: Process up to 50 atoms using buffered streams
        let search_futures = atoms.clone().into_iter().take(50).map(|atom| {
            let mut atom_request = request.clone();
            atom_request.query = atom.clone();
            atom_request.per_page = request.per_page.clamp(1, 5);
            atom_request.smart = false;
            atom_request.recursive = false;

            async move {
                match self.execute_search_internal(&atom_request).await {
                    Ok(bucket) => Some(bucket),
                    Err(err) => {
                        tracing::warn!("Swarm atom search failed for '{}': {}", atom, err);
                        None
                    }
                }
            }
        });

        let mut candidates = futures::stream::iter(search_futures)
            .buffer_unordered(50) // Parallelism factor (The Swarm Density)
            .filter_map(|res| async { res })
            .flat_map(futures::stream::iter)
            .collect::<Vec<_>>()
            .await;

        if candidates.is_empty() {
            // Deep Void Detection for Triple Hybrid
            // If we have strict requirements, we report Unmatched, otherwise Opportunity.
            // We can't check engine strategies directly easily without exposing them,
            // but we can infer from query like before or just assume Opportunity.
            let (title, evaluation) = if request.query.contains('/') {
                ("Regex Pattern Unmatched", "REGEX_UNMATCHED")
            } else {
                ("No Existing Implementation Found", "OPPORTUNITY_DETECTED")
            };

            return Ok(vec![SearchResult {
                category: SearchCategory::Issues,
                title: title.to_string(),
                subtitle: Some("Opportunity detected: consider creating this project".to_string()),
                url: "about:blank".to_string(),
                raw_url: None,
                repository: "agent/genesis".to_string(),
                path: None,
                stars: Some(0),
                forks: Some(0),
                language: Some("System".to_string()),
                updated_at: None,
                score: 100.0,
                score_breakdown: ScoreBreakdown::default(),
                snippet: Some(format!(
                    "The swarm did not locate existing repositories matching '{}'. This gap may indicate a high-value build opportunity.",
                    request.query
                )),
                highlights: Vec::new(),
                is_emergent: true,
                evaluation: Some(evaluation.to_string()),
                latent_score: Some(100.0),
            }]);
        }

        let mut seen = std::collections::HashSet::new();
        candidates.retain(|res| seen.insert(res.url.clone()));

        let lowered_query = request.query.to_lowercase();
        let mut enriched = Vec::new();
        for mut candidate in candidates {
            let mut latent = 0.0;
            let mut text = format!(
                "{} {}",
                candidate.title,
                candidate.subtitle.as_deref().unwrap_or("")
            )
            .to_lowercase();
            if let Some(snippet) = &candidate.snippet {
                text.push(' ');
                text.push_str(&snippet.to_lowercase());
            }

            // TRIPLE-HYBRID ENGINE EVALUATION
            let (eval_status, hybrid_score) = hybrid_engine.evaluate(&candidate);

            // If the engine returns Unmatched (specifically for Strict strategy), we respect the drop.
            if eval_status == crate::regex_filter::Evaluation::Unmatched {
                continue;
            }

            // If verified or strict match, use the engine's score.
            // If standard latent match, use existing atom logic.
            if hybrid_score > 0.0 {
                latent += hybrid_score;
            } else {
                // Fallback to atom swarm scoring
                for atom in &atoms {
                    let atom_lower = atom.to_lowercase();
                    if atom_lower.len() > 2 && text.contains(&atom_lower) {
                        latent += 10.0;
                    }
                }
            }

            if lowered_query.contains("rust") && candidate.language.as_deref() == Some("Rust") {
                latent += 20.0;
            }
            if text.contains("mcp") {
                latent += 50.0;
            }

            if latent > 10.0 {
                candidate.is_emergent = true;
                candidate.latent_score = Some(latent);
                candidate.evaluation = Some(eval_status.to_string());
                candidate.score += latent / 100.0;
                enriched.push(candidate);
            }
        }

        if enriched.is_empty() {
            let (title, evaluation) = if request.query.contains('/') {
                ("Regex Pattern Unmatched", "REGEX_UNMATCHED")
            } else {
                // **AUTONOMOUS GENESIS**: Record this opportunity
                crate::genesis::GenesisAgent::record_opportunity(&request.query);
                ("No Existing Implementation Found", "OPPORTUNITY_DETECTED")
            };

            return Ok(vec![SearchResult {
                category: SearchCategory::Issues,
                title: title.to_string(),
                subtitle: Some("Opportunity detected: consider creating this project".to_string()),
                url: "about:blank".to_string(),
                raw_url: None,
                repository: "agent/genesis".to_string(),
                path: None,
                stars: Some(0),
                forks: Some(0),
                language: Some("System".to_string()),
                updated_at: None,
                score: 100.0,
                score_breakdown: ScoreBreakdown::default(),
                snippet: Some(format!(
                    "The swarm did not locate existing repositories matching '{}'. This gap may indicate a high-value build opportunity.",
                    request.query
                )),
                highlights: Vec::new(),
                is_emergent: true,
                evaluation: Some(evaluation.to_string()),
                latent_score: Some(100.0),
            }]);
        }

        enriched.sort_by(|a, b| {
            let a_score = a.latent_score.unwrap_or(0.0);
            let b_score = b.latent_score.unwrap_or(0.0);
            b_score
                .partial_cmp(&a_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        Ok(enriched)
    }

    async fn search_repositories(
        &self,
        query: String,
        per_page: u32,
        _raw_mode: bool,
    ) -> Result<Vec<SearchResult>> {
        let response: GitHubSearchResponse<RepositoryItem> = self
            .request("search/repositories", &query, per_page)
            .await?;

        if response.incomplete_results {
            tracing::warn!(
                target: "hb-gh-search",
                total = response.total_count,
                "Repository results truncated"
            );
        }

        Ok(response
            .items
            .into_iter()
            .map(|item| {
                let breakdown = repo_breakdown(&item, &query);
                let updated = item
                    .updated_at
                    .as_deref()
                    .and_then(|iso| DateTime::parse_from_rfc3339(iso).ok())
                    .map(|dt| dt.with_timezone(&Utc));

                SearchResult {
                    category: SearchCategory::Repositories,
                    title: item.full_name.clone(),
                    subtitle: item.description.clone(),
                    url: item.html_url.clone(),
                    raw_url: None,
                    repository: item.full_name.clone(),
                    path: None,
                    stars: Some(item.stargazers_count),
                    forks: item.forks_count,
                    language: item.language.clone(),
                    updated_at: updated,
                    score: breakdown.total(),
                    score_breakdown: breakdown,
                    snippet: item.description.clone(),
                    highlights: Vec::new(),
                    is_emergent: false,
                    evaluation: None,
                    latent_score: None,
                }
            })
            .collect())
    }

    async fn search_code(
        &self,
        query: String,
        per_page: u32,
        raw_mode: bool,
    ) -> Result<Vec<SearchResult>> {
        // Parse the query using our robust syntax parser
        let parsed_query = syntax::SearchQuery::parse(&query);

        // Check for regex pattern
        if let Some(pattern) = parsed_query.regex {
            // Keep slashes for the expander which expects the raw pattern /.../
            return self
                .search_code_with_regex_expansion(pattern, per_page)
                .await;
        }

        // Ensure qualifiers are present (Smart Qualifier Injection)
        // Bypass if raw_mode is enabled
        let api_query = if raw_mode {
            query.clone()
        } else {
            parsed_query.ensure_qualifiers_for_code_search()
        };

        tracing::info!(
            target: "hb-gh-search",
            original = %query,
            api_query = %api_query,
            "Executing code search with enhanced query"
        );

        // Standard search with the enhanced query
        let response: GitHubSearchResponse<CodeItem> = self
            .request_with_accept(
                "search/code",
                &api_query,
                per_page,
                Some("application/vnd.github.text-match+json"),
            )
            .await?;

        if response.incomplete_results {
            tracing::warn!(
                target: "hb-gh-search",
                total = response.total_count,
                "Code results truncated"
            );
        }

        // Initial mapping from API response
        let mut initial_results: Vec<SearchResult> = response
            .items
            .into_iter()
            .map(|item| {
                let snippet = item
                    .text_matches
                    .as_ref()
                    .and_then(|matches| matches.first())
                    .map(|m| m.fragment.clone());
                let highlights: Vec<String> = item
                    .text_matches
                    .clone()
                    .unwrap_or_default()
                    .into_iter()
                    .flat_map(|m| m.matches.into_iter())
                    .filter_map(|capture| capture.text)
                    .collect();
                let breakdown = code_breakdown(&item, highlights.len());
                let updated = item
                    .repository
                    .updated_at
                    .as_deref()
                    .and_then(|iso| DateTime::parse_from_rfc3339(iso).ok())
                    .map(|dt| dt.with_timezone(&Utc));
                let rev = item.sha.as_deref();
                let raw_url =
                    compute_raw_url(&item.html_url, &item.repository.full_name, &item.path, rev);

                SearchResult {
                    category: SearchCategory::Code,
                    title: format!("{} :: {}", item.repository.full_name, item.path),
                    subtitle: Some(item.name.clone()),
                    url: item.html_url.clone(),
                    raw_url: Some(raw_url),
                    repository: item.repository.full_name.clone(),
                    path: Some(item.path.clone()),
                    stars: item.repository.stargazers_count,
                    forks: item.repository.forks_count,
                    language: item.language,
                    updated_at: updated,
                    score: breakdown.total(),
                    score_breakdown: breakdown,
                    snippet,
                    highlights,
                    is_emergent: false,
                    evaluation: None,
                    latent_score: None,
                }
            })
            .collect();

        // DEEP CONTEXT ENHANCEMENT
        // For the top 10 results, fetch the full content to provide rich context (+/- 10 lines)
        // This is critical for LLM consumption and 'Smart Mode' discovery.
        let hydration_futures: Vec<_> = initial_results
            .iter_mut()
            .take(10)
            .map(|result| {
                let client = self.clone();
                async move {
                    if let Some(path) = &result.path {
                        // Add individual timeout per file fetch
                        let fetch_future = client.fetch_file_content_with_hint(
                            &result.repository,
                            path,
                            result.raw_url.as_deref(),
                        );
                        match tokio::time::timeout(Duration::from_secs(10), fetch_future).await {
                            Ok(Ok(content)) => {
                                // DEEP CONTEXT ENHANCEMENT (Structural)
                                let lines: Vec<&str> = content.lines().collect();
                                let total_lines = lines.len();

                                // 1. Header (Imports/Context)
                                let header_end = 10.min(total_lines);
                                let header = lines[0..header_end].join("\n");

                                // 2. Find Match Window
                                if let Some(term) = result.highlights.first() {
                                    if let Some(idx) =
                                        content.to_lowercase().find(&term.to_lowercase())
                                    {
                                        let start_part = &content[..idx];
                                        let match_line_idx = start_part.matches('\n').count();

                                        // 3. Find Definition Anchor
                                        let mut anchor = None;
                                        for i in (0..match_line_idx).rev().take(50) {
                                            let line = lines[i];
                                            if line.starts_with("fn ")
                                                || line.starts_with("pub fn ")
                                                || line.starts_with("struct ")
                                                || line.starts_with("pub struct ")
                                                || line.starts_with("impl ")
                                                || line.starts_with("class ")
                                                || line.starts_with("def ")
                                            {
                                                anchor = Some(i);
                                                break;
                                            }
                                        }

                                        let start_context = anchor
                                            .unwrap_or_else(|| match_line_idx.saturating_sub(5));
                                        let end_context = (match_line_idx + 10).min(total_lines);

                                        let context_body =
                                            lines[start_context..end_context].join("\n");

                                        let elipsis_1 = if start_context > header_end {
                                            "\n...[elided]...\n"
                                        } else {
                                            "\n"
                                        };
                                        let elipsis_2 = if end_context < total_lines {
                                            "\n...[elided]..."
                                        } else {
                                            ""
                                        };

                                        result.snippet = Some(format!(
                                            "{}{}{}{}",
                                            header, elipsis_1, context_body, elipsis_2
                                        ));
                                    }
                                }
                            }
                            Ok(Err(_)) => {}
                            Err(_) => {}
                        }
                    }
                }
            })
            .collect();

        // Use a buffered stream to limit concurrency of hydration
        {
            use futures::stream::StreamExt;
            let mut stream = futures::stream::iter(hydration_futures).buffer_unordered(3);
            while stream.next().await.is_some() {}
        }

        Ok(initial_results)
    }

    /// Search code using regex pattern expansion
    async fn search_code_with_regex_expansion(
        &self,
        query: String,
        per_page: u32,
    ) -> Result<Vec<SearchResult>> {
        // Extract regex pattern
        let (prefix, pattern, suffix) =
            extract_regex_pattern(&query).ok_or_else(|| SearchError::UnexpectedResponse {
                status: StatusCode::BAD_REQUEST,
                body: "Invalid regex pattern format".to_string(),
            })?;

        // Expand pattern into multiple queries
        let expansions = expand_pattern(&pattern);

        tracing::info!(
            target: "hb-gh-search",
            pattern = %pattern,
            expansions = expansions.len(),
            "Expanding regex pattern into queries"
        );

        // Build full queries for each expansion
        let queries: Vec<String> = expansions
            .iter()
            .map(|expansion| {
                let mut parts = Vec::new();
                if !prefix.is_empty() {
                    parts.push(prefix.clone());
                }
                parts.push(expansion.clone());
                if !suffix.is_empty() {
                    parts.push(suffix.clone());
                }
                parts.join(" ")
            })
            .collect();

        // SMART QUEUE: Log optimization info
        tracing::info!(
            "Regex expansion: {} patterns generated from '{}'",
            queries.len(),
            pattern
        );

        // Execute all queries in parallel with LOW PRIORITY (bulk regex expansions)
        let expansion_count = queries.len();
        let tasks: Vec<_> = queries
            .iter()
            .map(|q| {
                // Create metadata for regex expansion query
                let metadata = rate_limiter::RequestMetadata {
                    query: q.clone(),
                    priority: rate_limiter::RequestPriority::Low, // Low priority for bulk
                    is_regex_expansion: true,
                    expansion_count,
                    submitted_at: std::time::Instant::now(),
                };

                let response_future: BoxFuture<'_, Result<GitHubSearchResponse<CodeItem>>> = self
                    .request_with_metadata(
                        "search/code",
                        q,
                        per_page,
                        Some("application/vnd.github.text-match+json"),
                        metadata,
                    )
                    .boxed();
                response_future
            })
            .collect();

        let responses = join_all(tasks).await;

        // Collect and deduplicate results
        let mut seen_files = std::collections::HashSet::new();
        let mut all_results = Vec::new();

        for response in responses {
            let response = response?;

            for item in response.items {
                // Create unique key: repo:path
                let file_key = format!("{}:{}", item.repository.full_name, item.path);

                if seen_files.contains(&file_key) {
                    continue;
                }
                seen_files.insert(file_key);

                let snippet = item
                    .text_matches
                    .as_ref()
                    .and_then(|matches| matches.first())
                    .map(|m| m.fragment.clone());
                let highlights: Vec<String> = item
                    .text_matches
                    .clone()
                    .unwrap_or_default()
                    .into_iter()
                    .flat_map(|m| m.matches.into_iter())
                    .filter_map(|capture| capture.text)
                    .collect();
                let breakdown = code_breakdown(&item, highlights.len());
                let updated = item
                    .repository
                    .updated_at
                    .as_deref()
                    .and_then(|iso| DateTime::parse_from_rfc3339(iso).ok())
                    .map(|dt| dt.with_timezone(&Utc));
                let rev = item.sha.as_deref();
                let raw_url =
                    compute_raw_url(&item.html_url, &item.repository.full_name, &item.path, rev);

                all_results.push(SearchResult {
                    category: SearchCategory::Code,
                    title: format!("{} :: {}", item.repository.full_name, item.path),
                    subtitle: Some(item.name.clone()),
                    url: item.html_url.clone(),
                    raw_url: Some(raw_url),
                    repository: item.repository.full_name.clone(),
                    path: Some(item.path.clone()),
                    stars: item.repository.stargazers_count,
                    forks: item.repository.forks_count,
                    language: item.language,
                    updated_at: updated,
                    score: breakdown.total(),
                    score_breakdown: breakdown,
                    snippet,
                    highlights,
                    is_emergent: false,
                    evaluation: None,
                    latent_score: None,
                });
            }
        }

        // Sort by score
        all_results.sort_by(SearchResult::by_score_desc);

        tracing::info!(
            target: "hb-gh-search",
            total_results = all_results.len(),
            unique_files = seen_files.len(),
            "Regex expansion search complete"
        );

        Ok(all_results)
    }

    async fn request<T: DeserializeOwned + Serialize>(
        &self,
        path: &str,
        query: &str,
        per_page: u32,
    ) -> Result<T> {
        self.request_with_accept(path, query, per_page, None).await
    }

    async fn request_with_accept<T: DeserializeOwned + Serialize>(
        &self,
        path: &str,
        query: &str,
        per_page: u32,
        accept: Option<&str>,
    ) -> Result<T> {
        // Default metadata for normal requests
        let metadata = rate_limiter::RequestMetadata {
            query: query.to_string(),
            priority: rate_limiter::RequestPriority::Normal,
            is_regex_expansion: false,
            expansion_count: 0,
            submitted_at: std::time::Instant::now(),
        };
        self.request_with_metadata(path, query, per_page, accept, metadata)
            .await
    }

    /// Internal request method with custom metadata for smart queue
    async fn request_with_metadata<T: DeserializeOwned + Serialize>(
        &self,
        path: &str,
        query: &str,
        per_page: u32,
        accept: Option<&str>,
        mut metadata: rate_limiter::RequestMetadata,
    ) -> Result<T> {
        let encoded_query = encode(query);
        let url = format!(
            "{base}/{path}?q={query}&per_page={per_page}",
            base = self.base_url,
            path = path,
            query = encoded_query,
            per_page = per_page,
        );

        tracing::debug!(
            target: "hb-gh-search-net",
            url = %url,
            priority = ?metadata.priority,
            "API_REQUEST_PREPARE: Constructing request"
        );

        // Cache Key Construction
        let cache_key = format!("req:{}:{}", url, accept.unwrap_or("default"));

        // 1. Try Cache
        if let Some(cache) = &self.cache {
            match cache.get::<T>(&cache_key).await {
                Ok(Some(cached_data)) => {
                    tracing::info!(target: "hb-gh-search", "Cache hit for {}", url);
                    return Ok(cached_data);
                }
                Ok(None) => {}
                Err(e) => tracing::warn!("Cache read error: {}", e),
            }
        }

        let mut headers = header::HeaderMap::new();
        if let Some(value) = accept {
            headers.insert(
                header::ACCEPT,
                header::HeaderValue::from_str(value).unwrap(),
            );
        }
        headers.insert(
            header::USER_AGENT,
            header::HeaderValue::from_static("hb-gh-search/0.1"),
        );

        if let Some(token) = &self.token {
            let value = format!("Bearer {}", token);
            let header_value =
                header::HeaderValue::from_str(&value).map_err(|_| SearchError::InvalidToken)?;
            headers.insert(header::AUTHORIZATION, header_value);
        }

        let headers = headers;
        const RATE_LIMIT_RETRY_MAX: usize = 3;
        let mut rate_limit_retries = 0usize;

        loop {
            metadata.submitted_at = Instant::now();
            let permit = self.queue.acquire(metadata.clone()).await;

            let response = self.http.get(&url).headers(headers.clone()).send().await?;

            // SMART QUEUE: Extract and update rate limit from response headers
            let rate_limit = response
                .headers()
                .get("x-ratelimit-limit")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u32>().ok());
            let rate_remaining = response
                .headers()
                .get("x-ratelimit-remaining")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u32>().ok());
            let rate_reset = response
                .headers()
                .get("x-ratelimit-reset")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u64>().ok());

            self.queue
                .update_from_headers(rate_limit, rate_remaining, rate_reset)
                .await;

            if response.status().is_success() {
                // SMART QUEUE: Mark request as consumed
                self.queue.consume().await;

                tracing::debug!("Request completed in {}ms", permit.elapsed().as_millis());

                let data = response.json::<T>().await?;

                // 2. Store in Cache
                if let Some(cache) = &self.cache {
                    if let Err(e) = cache.put(&cache_key, &data).await {
                        tracing::warn!("Cache write error: {}", e);
                    }
                }

                return Ok(data);
            }

            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            let is_rate_limited =
                status == StatusCode::FORBIDDEN && body.to_lowercase().contains("rate limit");

            if is_rate_limited && rate_limit_retries < RATE_LIMIT_RETRY_MAX {
                rate_limit_retries += 1;
                let queue_status = self.queue.status().await;
                let mut wait_duration = queue_status
                    .reset_at
                    .saturating_duration_since(Instant::now());
                if wait_duration == Duration::from_secs(0) {
                    wait_duration = Duration::from_secs(5);
                }
                wait_duration += Duration::from_millis(250);

                tracing::warn!(
                    "GitHub rate limit hit (retry {}/{}). Waiting {:?} before retrying query '{}'",
                    rate_limit_retries,
                    RATE_LIMIT_RETRY_MAX,
                    wait_duration,
                    metadata.query
                );

                sleep(wait_duration).await;
                continue;
            }

            // ENHANCED RATE LIMIT HANDLING
            if is_rate_limited {
                let queue_status = self.queue.status().await;
                eprintln!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                eprintln!("🚨 GITHUB API RATE LIMIT EXCEEDED");
                eprintln!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                eprintln!(
                    "📊 Current Status: {}/{} requests remaining ({}%)",
                    queue_status.remaining,
                    queue_status.limit,
                    queue_status.remaining_percent()
                );
                if self.token.is_none() {
                    eprintln!("⚠️  Running in UNAUTHENTICATED mode (60 requests/hour)");
                    eprintln!();
                    eprintln!("PERMANENT FIX:");
                    eprintln!("1. Create a GitHub Personal Access Token:");
                    eprintln!("   https://github.com/settings/tokens/new");
                    eprintln!("   (No scopes needed for public repos)");
                    eprintln!();
                    eprintln!("2. Add to ~/.bashrc:");
                    eprintln!("   export GITHUB_TOKEN=\"ghp_YourTokenHere\"");
                    eprintln!();
                    eprintln!("3. Reload shell: source ~/.bashrc");
                    eprintln!();
                    eprintln!("📈 Authenticated limit: 5,000 requests/hour");
                } else {
                    eprintln!("⚠️  Running in AUTHENTICATED mode but limit reached");
                    eprintln!("   Wait for rate limit reset or use a different token");
                }
                eprintln!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            }

            return Err(SearchError::UnexpectedResponse { status, body });
        }
    }

    async fn search_issues(
        &self,
        query: String,
        per_page: u32,
        is_pr: bool,
        _raw_mode: bool,
    ) -> Result<Vec<SearchResult>> {
        let mut final_query = query.clone();
        if is_pr {
            final_query.push_str(" type:pr");
        } else {
            final_query.push_str(" type:issue");
        }

        let response: GitHubSearchResponse<IssueItem> = self
            .request("search/issues", &final_query, per_page)
            .await?;

        Ok(response
            .items
            .into_iter()
            .map(|item| {
                let breakdown = issue_breakdown(&item);
                let updated = item
                    .updated_at
                    .as_deref()
                    .and_then(|iso| DateTime::parse_from_rfc3339(iso).ok())
                    .map(|dt| dt.with_timezone(&Utc));

                // Extract repo name from URL if possible (e.g. api.github.com/repos/owner/repo)
                let repo_name = item
                    .repository_url
                    .split("/repos/")
                    .last()
                    .unwrap_or("unknown")
                    .to_string();

                SearchResult {
                    category: if is_pr {
                        SearchCategory::PullRequests
                    } else {
                        SearchCategory::Issues
                    },
                    title: format!("#{}: {}", item.number, item.title),
                    subtitle: Some(format!("{} by {}", item.state, item.user.login)),
                    url: item.html_url.clone(),
                    raw_url: None,
                    repository: repo_name,
                    path: None,
                    stars: Some(item.comments), // Using comments count as proxy for engagement
                    forks: None,
                    language: None,
                    updated_at: updated,
                    score: breakdown.total(),
                    score_breakdown: breakdown,
                    snippet: item.body.clone().map(|b| b.chars().take(200).collect()),
                    highlights: Vec::new(),
                    is_emergent: false,
                    evaluation: None,
                    latent_score: None,
                }
            })
            .collect())
    }

    async fn search_commits(
        &self,
        query: String,
        per_page: u32,
        _raw_mode: bool,
    ) -> Result<Vec<SearchResult>> {
        let response: GitHubSearchResponse<CommitItem> = self
            .request_with_accept(
                "search/commits",
                &query,
                per_page,
                Some("application/vnd.github.cloak-preview+json"),
            )
            .await?;

        Ok(response
            .items
            .into_iter()
            .map(|item| {
                let breakdown = ScoreBreakdown {
                    base: item.score,
                    stars: item.repository.stargazers_count.unwrap_or(0) as f64 / 100.0,
                    recency: recency_bonus(Some(&item.commit.author.date)),
                    text_match: 0.0,
                    readability: 0.0,
                    fusion: 0.0,
                    context: 0.0,
                    rarity: 0.0,
                    bm25: 0.0,
                    identifier: 0.0,
                    popularity: 0.0,
                    language_affinity: 0.0,
                    commit_recency: 0.0,
                    ml: 0.0,
                    semantic: 0.0,
                };

                SearchResult {
                    category: SearchCategory::Commits,
                    title: format!("{}: {}", item.repository.full_name, &item.sha[..7]),
                    subtitle: Some(item.commit.message.clone()),
                    url: item.html_url.clone(),
                    raw_url: None,
                    repository: item.repository.full_name.clone(),
                    path: None,
                    stars: item.repository.stargazers_count,
                    forks: item.repository.forks_count,
                    language: None,
                    updated_at: DateTime::parse_from_rfc3339(&item.commit.author.date)
                        .ok()
                        .map(|dt| dt.with_timezone(&Utc)),
                    score: breakdown.total(),
                    score_breakdown: breakdown,
                    snippet: Some(item.commit.message),
                    highlights: Vec::new(),
                    is_emergent: false,
                    evaluation: None,
                    latent_score: None,
                }
            })
            .collect())
    }

    async fn search_topics(
        &self,
        query: String,
        per_page: u32,
        _raw_mode: bool,
    ) -> Result<Vec<SearchResult>> {
        let response: GitHubSearchResponse<TopicItem> = self
            .request_with_accept(
                "search/topics",
                &query,
                per_page,
                Some("application/vnd.github.mercy-preview+json"),
            )
            .await?;

        Ok(response
            .items
            .into_iter()
            .map(|item| {
                let breakdown = ScoreBreakdown {
                    base: item.score,
                    stars: if item.featured { 5.0 } else { 0.0 },
                    recency: recency_bonus(Some(&item.updated_at)),
                    text_match: 0.0,
                    readability: 0.0,
                    fusion: 0.0,
                    context: 0.0,
                    rarity: 0.0,
                    bm25: 0.0,
                    identifier: 0.0,
                    popularity: 0.0,
                    language_affinity: 0.0,
                    commit_recency: 0.0,
                    ml: 0.0,
                    semantic: 0.0,
                };

                SearchResult {
                    category: SearchCategory::Topics,
                    title: item.display_name.unwrap_or(item.name.clone()),
                    subtitle: item.description.clone(),
                    url: format!("https://github.com/topics/{}", item.name),
                    raw_url: None,
                    repository: "Topics".to_string(),
                    path: None,
                    stars: None,
                    forks: None,
                    language: None,
                    updated_at: DateTime::parse_from_rfc3339(&item.updated_at)
                        .ok()
                        .map(|dt| dt.with_timezone(&Utc)),
                    score: breakdown.total(),
                    score_breakdown: breakdown,
                    snippet: item.description,
                    highlights: Vec::new(),
                    is_emergent: false,
                    evaluation: None,
                    latent_score: None,
                }
            })
            .collect())
    }

    async fn search_users(
        &self,
        query: String,
        per_page: u32,
        _raw_mode: bool,
    ) -> Result<Vec<SearchResult>> {
        let response: GitHubSearchResponse<UserItem> =
            self.request("search/users", &query, per_page).await?;

        Ok(response
            .items
            .into_iter()
            .map(|item| {
                // Fetch details for breakdown? No, search item is sparse.
                // We'll use score as base.
                let breakdown = ScoreBreakdown {
                    base: item.score,
                    stars: 0.0,
                    recency: 0.0,
                    text_match: 0.0,
                    readability: 0.0,
                    fusion: 0.0,
                    context: 0.0,
                    rarity: 0.0,
                    bm25: 0.0,
                    identifier: 0.0,
                    popularity: 0.0,
                    language_affinity: 0.0,
                    commit_recency: 0.0,
                    ml: 0.0,
                    semantic: 0.0,
                };

                SearchResult {
                    category: SearchCategory::Users,
                    title: item.login.clone(),
                    subtitle: Some(item.html_url.clone()),
                    url: item.html_url.clone(),
                    raw_url: None,
                    repository: "Users".to_string(),
                    path: None,
                    stars: None,
                    forks: None,
                    language: None,
                    updated_at: None,
                    score: breakdown.total(),
                    score_breakdown: breakdown,
                    snippet: Some(format!("User Type: {}", item.r#type)),
                    highlights: Vec::new(),
                    is_emergent: false,
                    evaluation: None,
                    latent_score: None,
                }
            })
            .collect())
    }

    async fn search_discussions(
        &self,
        _query: String,
        _per_page: u32,
        _raw_mode: bool,
    ) -> Result<Vec<SearchResult>> {
        // Discussions are currently via GraphQL or not standard Search API.
        // Return empty but no error to avoid crashing unified search.
        Ok(Vec::new())
    }

    pub async fn fetch_repo_tree(
        &self,
        repo_full_name: &str,
        limit: usize,
    ) -> Result<Vec<RepoTreeEntry>> {
        #[derive(Deserialize)]
        struct TreeResponse {
            tree: Vec<TreeNode>,
        }

        #[derive(Deserialize)]
        struct TreeNode {
            path: String,
            #[serde(rename = "type")]
            node_type: String,
            sha: String,
        }

        let url = format!(
            "{}/repos/{}/git/trees/HEAD?recursive=1",
            self.base_url, repo_full_name
        );

        let mut headers = header::HeaderMap::new();
        headers.insert(
            header::USER_AGENT,
            header::HeaderValue::from_static("hb-gh-search/0.1"),
        );
        if let Some(token) = &self.token {
            let val = format!("Bearer {}", token);
            headers.insert(
                header::AUTHORIZATION,
                header::HeaderValue::from_str(&val).map_err(|_| SearchError::InvalidToken)?,
            );
        }

        let response = self.http.get(&url).headers(headers).send().await?;
        if !response.status().is_success() {
            return Err(SearchError::UnexpectedResponse {
                status: response.status(),
                body: response.text().await.unwrap_or_default(),
            });
        }

        let data: TreeResponse = response.json().await?;
        Ok(data
            .tree
            .into_iter()
            .take(limit)
            .map(|node| RepoTreeEntry {
                path: node.path,
                entry_type: node.node_type,
                sha: node.sha,
            })
            .collect())
    }

    pub async fn fetch_file_content_with_hint(
        &self,
        repo_full_name: &str,
        path: &str,
        cache_hint: Option<&str>,
    ) -> Result<String> {
        let url = format!(
            "{}/repos/{}/contents/{}",
            self.base_url, repo_full_name, path
        );

        let rev_hint = cache_hint.unwrap_or(path);
        let cache_key = format!("content:{}:{}", repo_full_name, rev_hint);

        // Memory cache first (fast path)
        if let Some(mem) = self.content_mem.get(&cache_key).await {
            return Ok((*mem).clone());
        }

        // Disk cache
        if let Some(cache) = &self.cache {
            if let Ok(Some(cached)) = cache.get::<String>(&cache_key).await {
                self.content_mem
                    .insert(cache_key.clone(), Arc::new(cached.clone()))
                    .await;
                return Ok(cached);
            }
        }

        let mut headers = header::HeaderMap::new();
        headers.insert(
            header::USER_AGENT,
            header::HeaderValue::from_static("hb-gh-search/0.1"),
        );
        if let Some(token) = &self.token {
            let val = format!("Bearer {}", token);
            headers.insert(
                header::AUTHORIZATION,
                header::HeaderValue::from_str(&val).map_err(|_| SearchError::InvalidToken)?,
            );
        }

        let response = self.http.get(&url).headers(headers).send().await?;
        if response.status() == StatusCode::NOT_FOUND {
            return Err(SearchError::UnexpectedResponse {
                status: StatusCode::NOT_FOUND,
                body: "File not found".to_string(),
            });
        }
        if !response.status().is_success() {
            return Err(SearchError::UnexpectedResponse {
                status: response.status(),
                body: response.text().await.unwrap_or_default(),
            });
        }

        #[derive(Deserialize)]
        struct ContentResponse {
            content: String,
            encoding: String,
        }

        let resp: ContentResponse = response.json().await?;

        let decoded = if resp.encoding == "base64" {
            let clean = resp.content.replace('\n', "");
            use base64::{engine::general_purpose, Engine as _};
            let bytes = general_purpose::STANDARD.decode(&clean).map_err(|e| {
                SearchError::UnexpectedResponse {
                    status: StatusCode::INTERNAL_SERVER_ERROR,
                    body: format!("Base64 decode failed: {}", e),
                }
            })?;
            String::from_utf8(bytes).map_err(|_| SearchError::UnexpectedResponse {
                status: StatusCode::INTERNAL_SERVER_ERROR,
                body: "Invalid UTF-8".to_string(),
            })?
        } else {
            resp.content
        };

        // Cache it (disk + memory)
        if let Some(cache) = &self.cache {
            let _ = cache.put(&cache_key, &decoded).await;
        }
        self.content_mem
            .insert(cache_key, Arc::new(decoded.clone()))
            .await;

        Ok(decoded)
    }

    pub async fn fetch_file_content(&self, repo_full_name: &str, path: &str) -> Result<String> {
        self.fetch_file_content_with_hint(repo_full_name, path, None)
            .await
    }
}

#[derive(Debug, Deserialize, Serialize)]
struct GitHubSearchResponse<T> {
    total_count: u64,
    incomplete_results: bool,
    items: Vec<T>,
}

fn issue_breakdown(item: &IssueItem) -> ScoreBreakdown {
    ScoreBreakdown {
        base: item.score,
        stars: star_bonus(item.comments * 10), // Weight comments heavily
        recency: recency_bonus(item.updated_at.as_deref()),
        text_match: 0.0,
        readability: 0.0,
        fusion: 0.0,
        context: 0.0,
        rarity: 0.0,
        bm25: 0.0,
        identifier: 0.0,
        popularity: 0.0,
        language_affinity: 0.0,
        commit_recency: 0.0,
        ml: 0.0,
        semantic: 0.0,
    }
}

fn repo_breakdown(item: &RepositoryItem, query: &str) -> ScoreBreakdown {
    // Compute text_match by checking how many query terms appear in name/description
    let haystack = format!(
        "{} {}",
        item.full_name.to_lowercase(),
        item.description.as_deref().unwrap_or("").to_lowercase()
    );
    let query_lower = query.to_lowercase();
    let query_terms: Vec<&str> = query_lower
        .split(|c: char| !c.is_alphanumeric())
        .filter(|s| s.len() > 2)
        .collect();
    let matched_terms = query_terms
        .iter()
        .filter(|term| haystack.contains(*term))
        .count();
    // Score: 1.0 per matched term, max 5.0
    let text_match = (matched_terms as f64).min(5.0);

    ScoreBreakdown {
        base: item.score,
        stars: star_bonus(item.stargazers_count),
        recency: recency_bonus(item.updated_at.as_deref()),
        text_match,
        readability: 0.0,
        fusion: 0.0,
        context: 0.0,
        rarity: 0.0,
        bm25: 0.0,
        identifier: 0.0,
        popularity: 0.0,
        language_affinity: 0.0,
        commit_recency: 0.0,
        ml: 0.0,
        semantic: 0.0,
    }
}

fn code_breakdown(item: &CodeItem, match_count: usize) -> ScoreBreakdown {
    let readability = calculate_readability(
        item.text_matches
            .as_ref()
            .and_then(|m| m.first().map(|f| f.fragment.as_str()))
            .unwrap_or(""),
    );
    ScoreBreakdown {
        base: item.score,
        stars: star_bonus(item.repository.stargazers_count.unwrap_or(0)),
        recency: recency_bonus(item.repository.updated_at.as_deref()),
        text_match: highlight_bonus(match_count),
        readability,
        fusion: 0.0,
        context: 0.0,
        rarity: 0.0,
        bm25: 0.0,
        identifier: 0.0,
        popularity: 0.0,
        language_affinity: 0.0,
        commit_recency: 0.0,
        ml: 0.0,
        semantic: 0.0,
    }
}

fn calculate_readability(content: &str) -> f64 {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return 0.0;
    }

    let mut score = 0.0f64;

    // Heuristic 1: Documentation presence (comments)
    if trimmed.contains("//")
        || trimmed.contains("/*")
        || trimmed.contains("# ")
        || trimmed.contains("///")
    {
        score += 1.5;
    }

    // Heuristic 2: Structural complexity (brackets, indentation)
    let curlies = trimmed.matches('{').count();
    let parens = trimmed.matches('(').count();
    let brackets = trimmed.matches('[').count();

    if curlies > 0 && curlies < 20 {
        score += 1.0;
    }
    if parens > 2 {
        score += 0.5;
    }
    if brackets > 0 {
        score += 0.3;
    }

    // Heuristic 3: Code keywords
    let keywords = [
        "fn ", "pub ", "struct ", "impl ", "class ", "def ", "import ", "export ", "from ",
        "const ", "let ", "var ",
    ];
    for kw in keywords {
        if trimmed.contains(kw) {
            score += 0.5;
            break; // Just one bonus for having any keyword
        }
    }

    // Heuristic 4: Informational density (unique words)
    let words: Vec<&str> = trimmed.split_whitespace().collect();
    if words.len() > 10 {
        let unique_words: std::collections::HashSet<_> = words.iter().collect();
        let density = unique_words.len() as f64 / words.len() as f64;
        if density > 0.5 {
            score += 1.0;
        }
    }

    // Heuristic 5: Penalty for minification/excessive line length
    let max_line_len = trimmed.lines().map(|l| l.len()).max().unwrap_or(0);
    if max_line_len > 300 {
        score -= 2.0;
    }

    score.clamp(0.0, 5.0)
}

pub fn derive_repositories_from_results(results: &[SearchResult]) -> Vec<SearchResult> {
    let mut repos: std::collections::HashMap<String, SearchResult> =
        std::collections::HashMap::new();
    let existing_repos: std::collections::HashSet<_> = results
        .iter()
        .filter(|r| r.category == SearchCategory::Repositories)
        .map(|r| r.repository.clone())
        .collect();

    for res in results {
        if res.category == SearchCategory::Code {
            let repo_name = &res.repository;
            if !existing_repos.contains(repo_name) && !repos.contains_key(repo_name) {
                repos.insert(
                    repo_name.clone(),
                    SearchResult {
                        category: SearchCategory::Repositories,
                        title: repo_name.clone(),
                        subtitle: Some(format!("Derived from code matches in {}", repo_name)),
                        url: format!("https://github.com/{}", repo_name),
                        raw_url: None,
                        repository: repo_name.clone(),
                        path: None,
                        stars: res.stars,
                        forks: res.forks,
                        language: res.language.clone(),
                        updated_at: res.updated_at,
                        score: res.score * 0.9,
                        score_breakdown: res.score_breakdown.clone(),
                        snippet: Some(
                            "This repository contains code matching the search query.".to_string(),
                        ),
                        highlights: Vec::new(),
                        is_emergent: true,
                        evaluation: Some("DERIVED_FROM_CODE".to_string()),
                        latent_score: None,
                    },
                );
            }
        }
    }
    repos.into_values().collect()
}

fn star_bonus(stars: u64) -> f64 {
    (stars as f64).ln_1p().min(6.0)
}

fn recency_bonus(updated_at: Option<&str>) -> f64 {
    updated_at
        .and_then(|iso| DateTime::parse_from_rfc3339(iso).ok())
        .map(|dt| {
            let delta = Utc::now() - dt.with_timezone(&Utc);
            let age_days = delta.num_days().max(0) as f64;
            let freshness = ((365.0 - age_days) / 365.0).clamp(0.0, 1.0);
            freshness * 6.0
        })
        .unwrap_or(0.0)
}

fn highlight_bonus(count: usize) -> f64 {
    (count.min(6) as f64) * 0.5
}

fn overlap_bonus(query: &str, res: &SearchResult) -> f64 {
    let tokens = tokenize_query(query);
    lexical_bonus(&tokens, res)
}

fn tokenize_query(query: &str) -> Vec<String> {
    query
        .to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|s| s.len() > 2)
        .map(|s| s.to_string())
        .collect()
}

fn token_hits(haystack: &str, tokens: &[String]) -> usize {
    tokens.iter().filter(|t| haystack.contains(&***t)).count()
}

fn lexical_bonus(tokens: &[String], res: &SearchResult) -> f64 {
    if tokens.is_empty() {
        return 0.0;
    }
    let title = res.title.to_lowercase();
    let subtitle = res.subtitle.as_deref().unwrap_or("").to_lowercase();
    let path = res.path.as_deref().unwrap_or("").to_lowercase();
    let repo = res.repository.to_lowercase();
    let snippet = res.snippet.as_deref().unwrap_or("").to_lowercase();

    let title_hits = token_hits(&title, tokens);
    let subtitle_hits = token_hits(&subtitle, tokens);
    let path_hits = token_hits(&path, tokens);
    let repo_hits = token_hits(&repo, tokens);
    let snippet_hits = token_hits(&snippet, tokens);

    let mut score = 0.0;
    score += (title_hits as f64) * 1.2;
    score += (subtitle_hits as f64) * 0.8;
    score += (path_hits as f64) * 1.0;
    score += (repo_hits as f64) * 0.6;
    score += (snippet_hits as f64) * 0.6;

    score.min(8.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn repo_breakdown_prefers_popular() {
        let popular = RepositoryItem {
            full_name: "popular/tool".to_string(),
            description: None,
            html_url: String::new(),
            stargazers_count: 10_000,
            forks_count: None,
            language: None,
            updated_at: None,
            score: 10.0,
        };
        let niche = RepositoryItem {
            full_name: "niche/tool".to_string(),
            description: None,
            html_url: String::new(),
            stargazers_count: 10,
            forks_count: None,
            language: None,
            updated_at: None,
            score: 10.0,
        };

        assert!(repo_breakdown(&popular, "tool").total() > repo_breakdown(&niche, "tool").total());
    }

    #[test]
    fn recency_bonus_prefers_newer() {
        let recent = recency_bonus(Some("2025-10-01T00:00:00Z"));
        let old = recency_bonus(Some("2020-01-01T00:00:00Z"));
        assert!(recent > old);
    }

    #[test]
    fn raw_url_parses_blob_url() {
        let html = "https://github.com/org/repo/blob/main/src/lib.rs";
        let raw = build_raw_url_from_html(html).unwrap();
        assert_eq!(
            raw,
            "https://raw.githubusercontent.com/org/repo/main/src/lib.rs"
        );
    }

    #[test]
    fn raw_url_falls_back_to_head() {
        let raw = compute_raw_url(
            "https://example.com/not-github",
            "org/repo",
            "nested/path.rs",
            None,
        );
        assert_eq!(
            raw,
            "https://raw.githubusercontent.com/org/repo/HEAD/nested/path.rs"
        );
    }

    #[test]
    fn test_calculate_readability_edge_cases() {
        assert_eq!(calculate_readability(""), 0.0);
        assert_eq!(calculate_readability("   "), 0.0);
        assert_eq!(calculate_readability("\n\n"), 0.0);

        // Very short / non-descriptive
        assert!(calculate_readability("a") < 1.0);
        assert!(calculate_readability("foo bar baz") < 1.5);

        // Good code snippet
        let code = r#"
            /**
             * Processes the query
             */
            pub fn process_query(q: &str) -> String {
                let result = q.to_uppercase();
                println!("Result: {}", result);
                result
            }
        "#;
        assert!(calculate_readability(code) > 2.5);

        // Minified code (should be penalized or at least not highly scored)
        let minified =
            "function a(b){return b.split('').reverse().join('');}var x=a('test');console.log(x);"
                .repeat(10);
        assert!(calculate_readability(&minified) < 3.0);
    }
}
