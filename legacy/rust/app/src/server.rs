#[cfg(feature = "web")]
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
#[cfg(feature = "web")]
use serde::{Deserialize, Serialize};
#[cfg(feature = "web")]
use serde_json::json;
#[cfg(feature = "web")]
use std::net::SocketAddr;
#[cfg(feature = "web")]
use std::sync::Arc;
#[cfg(feature = "web")]
use tower_http::cors::CorsLayer;
#[cfg(feature = "web")]
use tracing::info;

use gh_search_core::orchestrator::{execute_unified_search, UnifiedSearchArgs};
use gh_search_core::{
    clustering::{cluster_results, ClusteredResults},
    GitHubSearchClient, LlmClient, NoveltyDescriptor, SearchCategory, SearchRequest, SearchResult,
    SelfImprover, VariantRecord, LINEAGE_LOG,
};

use gh_search_core::config::Config;

#[cfg(feature = "web")]
use rust_embed::RustEmbed;

#[cfg(feature = "web")]
#[derive(RustEmbed)]
#[folder = "../frontend/out/"]
#[prefix = ""]
struct Asset;

#[cfg(feature = "web")]
const INDEX_HTML: &str = include_str!("../static/index.html");
#[cfg(feature = "web")]
const STYLES_CSS: &str = include_str!("../static/css/styles.css");
#[cfg(feature = "web")]
const APP_JS: &str = include_str!("../static/js/app.js");

#[cfg(feature = "web")]
#[derive(Clone)]
pub struct ApiState {
    pub client: Arc<GitHubSearchClient>,
    #[allow(dead_code)]
    pub config: Config,
    pub llm_client: Arc<LlmClient>,
}

#[cfg(feature = "web")]
pub type SharedState = Arc<ApiState>;

#[cfg(feature = "web")]
pub async fn run_server(host: String, port: u16, token: Option<String>) -> anyhow::Result<()> {
    info!("Starting server on {}:{}", host, port);
    let addr_str = format!("{}:{}", host, port);
    let addr: SocketAddr = addr_str.parse()?;

    let client = GitHubSearchClient::new(token);

    let state = Arc::new(ApiState {
        client: Arc::new(client),
        config: Config::from_env(),
        llm_client: Arc::new(LlmClient::new()),
    });

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/health", get(health_check))
        .route("/api/search", get(http_search))
        .route("/ws/search", get(ws_search))
        .route("/api/metrics", get(api_metrics))
        .route("/api/compare", get(http_compare))
        .route("/api/summarize", post(api_summarize))
        .route("/v1/chat/completions", post(openai_chat_completions))
        .route("/static/css/styles.css", get(styles_css))
        .route("/static/js/app.js", get(app_js))
        .route("/*path", get(static_assets))
        .route("/", get(index))
        .with_state(state)
        .layer(CorsLayer::permissive());
    let app = app.layer(axum::middleware::from_fn(session_middleware));

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

#[cfg(not(feature = "web"))]
pub async fn run_server(_host: String, _port: u16, _token: Option<String>) -> anyhow::Result<()> {
    anyhow::bail!("Web server feature not enabled. Rebuild with --features web");
}

#[cfg(feature = "web")]
async fn session_middleware(
    req: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> impl IntoResponse {
    let session_id = std::env::var("AG_SESSION_ID").unwrap_or_else(|_| "unknown".to_string());
    let span = tracing::info_span!("session", session_id = %session_id);
    use tracing::Instrument;
    next.run(req).instrument(span).await
}

// Handler functions

#[cfg(feature = "web")]
async fn index() -> impl IntoResponse {
    // Try to serve Next.js index first
    if let Some(content) = Asset::get("index.html") {
        return (
            [(axum::http::header::CONTENT_TYPE, "text/html")],
            content.data,
        )
            .into_response();
    }
    // Fallback to embedded HTMX static
    Html(INDEX_HTML).into_response()
}

#[cfg(feature = "web")]
async fn static_assets(
    axum::extract::Path(path): axum::extract::Path<String>,
) -> impl IntoResponse {
    if let Some(content) = Asset::get(&path) {
        let mime = mime_guess::from_path(&path).first_or_octet_stream();
        return (
            [(axum::http::header::CONTENT_TYPE, mime.as_ref())],
            content.data,
        )
            .into_response();
    }

    // Fallback logic for legacy paths if needed
    if path == "static/css/styles.css" {
        return styles_css().await.into_response();
    }
    if path == "static/js/app.js" {
        return app_js().await.into_response();
    }

    axum::http::StatusCode::NOT_FOUND.into_response()
}

#[cfg(feature = "web")]
async fn styles_css() -> Response {
    let mut res = Response::new(STYLES_CSS.into());
    res.headers_mut().insert(
        axum::http::header::CONTENT_TYPE,
        axum::http::HeaderValue::from_static("text/css"),
    );
    res
}

#[cfg(feature = "web")]
async fn app_js() -> Response {
    let mut res = Response::new(APP_JS.into());
    res.headers_mut().insert(
        axum::http::header::CONTENT_TYPE,
        axum::http::HeaderValue::from_static("application/javascript"),
    );
    res
}

#[cfg(feature = "web")]
#[derive(Serialize)]
struct HealthResponse {
    status: String,
    version: String,
    uptime: u64,
}

static START_TIME: std::sync::OnceLock<std::time::Instant> = std::sync::OnceLock::new();

#[cfg(feature = "web")]
async fn health_check() -> Json<HealthResponse> {
    let _ = START_TIME.set(std::time::Instant::now());
    Json(HealthResponse {
        status: "ok".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        uptime: START_TIME.get().unwrap().elapsed().as_secs(),
    })
}

fn default_true() -> bool {
    true
}

#[cfg(feature = "web")]
#[derive(Deserialize, Debug)]
struct SearchParams {
    #[serde(alias = "q")]
    query: Option<String>,
    categories: Option<String>,
    per_page: Option<u32>,
    #[serde(default = "default_true")]
    smart: bool,
    #[serde(default)]
    recursive: Option<bool>,
    #[serde(default)]
    cluster: bool,
    #[serde(default)]
    ranker: Option<String>,
    #[serde(default)]
    experimental: Option<bool>,
    #[serde(default)]
    raw: Option<bool>,
}

#[cfg(feature = "web")]
#[derive(Serialize)]
#[serde(untagged)]
pub enum SearchResponse {
    List(Vec<SearchResult>),
    Clustered(ClusteredResults),
    Enhanced(SearchResponseV2),
}

#[cfg(feature = "web")]
#[derive(Serialize)]
pub struct SearchResponseV2 {
    pub query: String,
    pub results: Vec<SearchResult>,
    pub donors: Vec<SearchResult>,
    pub intent: Option<IntentInfo>,
    pub metrics: SearchMetrics,
}

#[cfg(feature = "web")]
#[derive(Serialize)]
pub struct IntentInfo {
    pub label: String,
    pub confidence: f64,
}

#[cfg(feature = "web")]
#[derive(Serialize)]
pub struct SearchMetrics {
    pub latency_ms: u64,
    pub strategies: Vec<String>,
}

#[cfg(feature = "web")]
#[derive(Serialize)]
struct ApiError {
    message: String,
}

#[cfg(feature = "web")]
#[derive(Serialize)]
struct CompareResponse {
    query: String,
    optimised: Vec<SearchResult>,
    raw: Vec<SearchResult>,
    meta: CompareMeta,
}

#[cfg(feature = "web")]
#[derive(Serialize)]
struct CompareMeta {
    optimised_count: usize,
    raw_count: usize,
    time_ms: u64,
}

#[cfg(feature = "web")]
#[tracing::instrument(skip(state))]
async fn http_search(
    Query(params): Query<SearchParams>,
    State(state): State<SharedState>,
) -> Result<impl IntoResponse, (axum::http::StatusCode, axum::Json<ApiError>)> {
    let start_time = std::time::Instant::now();
    let query = params.query.clone().unwrap_or_default();
    if query.trim().is_empty() {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            axum::Json(ApiError {
                message: "Query required".to_string(),
            }),
        ));
    }

    let experimental = params
        .ranker
        .as_deref()
        .map(|r| r.eq_ignore_ascii_case("experimental"))
        .unwrap_or_else(|| params.experimental.unwrap_or(false));

    let cats = params.categories.map(|c| {
        c.split(',')
            .map(|s| s.trim().to_string())
            .collect::<Vec<_>>()
    });

    let unified_args = UnifiedSearchArgs {
        query: query.clone(),
        categories: cats,
        per_page: params.per_page,
        raw: params.raw,
        smart: Some(params.smart),
        recursive: params.recursive.or(Some(true)),
        experimental: Some(experimental),
    };

    let results = execute_unified_search(&state.client, unified_args.clone())
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(ApiError {
                    message: e.to_string(),
                }),
            )
        })?;

    // Smart analysis is now handled internally by client.search()

    // Metrics Recording
    let latency_ms = start_time.elapsed().as_secs_f64() * 1000.0;
    let record = VariantRecord {
        id: uuid::Uuid::new_v4().to_string(),
        parent_id: None,
        timestamp: chrono::Utc::now(),
        summary: format!(
            "query='{}' results={} latency={:.2}ms",
            query,
            results.len(),
            latency_ms
        ),
        metrics_path: None,
        novelty: NoveltyDescriptor {
            ranking_signals: vec!["default".into()],
            http_capabilities: vec!["clustering".into()],
            ux_capabilities: vec![],
        },
    };
    let _ = SelfImprover::append_record(std::path::Path::new(LINEAGE_LOG), &record);

    if params.cluster {
        let clusters = cluster_results(results);
        Ok(axum::Json(SearchResponse::Clustered(clusters)))
    } else if params.smart {
        // Return V2 response for smart/orchestrated searches
        let donors: Vec<SearchResult> = results
            .iter()
            .filter(|r| r.is_emergent || r.evaluation.as_deref().unwrap_or("").contains("DONOR"))
            .cloned()
            .collect();

        let intent_info = if query.to_lowercase().contains("dayz") {
            Some(IntentInfo {
                label: "DayZ Pattern Discovery".into(),
                confidence: 0.95,
            })
        } else if query.to_lowercase().contains("config") || query.to_lowercase().contains("xml") {
            Some(IntentInfo {
                label: "Configuration Matching".into(),
                confidence: 0.85,
            })
        } else {
            None
        };

        Ok(axum::Json(SearchResponse::Enhanced(SearchResponseV2 {
            query,
            results,
            donors,
            intent: intent_info,
            metrics: SearchMetrics {
                latency_ms: latency_ms as u64,
                strategies: vec!["unified".into(), "smart".into(), "donor_harvest".into()],
            },
        })))
    } else {
        Ok(axum::Json(SearchResponse::List(results)))
    }
}

#[cfg(feature = "web")]
#[tracing::instrument(skip(state))]
async fn http_compare(
    Query(params): Query<SearchParams>,
    State(state): State<SharedState>,
) -> Result<impl IntoResponse, (axum::http::StatusCode, axum::Json<ApiError>)> {
    let start_time = std::time::Instant::now();
    let query = params.query.clone().unwrap_or_default();
    if query.trim().is_empty() {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            axum::Json(ApiError {
                message: "Query required".to_string(),
            }),
        ));
    }

    let cats = params.categories.map(|c| {
        c.split(',')
            .map(|s| s.trim().to_string())
            .collect::<Vec<_>>()
    });

    let request_optimised = UnifiedSearchArgs {
        query: query.clone(),
        categories: cats.clone(),
        per_page: params.per_page,
        raw: Some(false),
        smart: Some(true),
        recursive: Some(true),
        experimental: Some(true),
    };

    let request_raw = UnifiedSearchArgs {
        query: query.clone(),
        categories: cats,
        per_page: params.per_page,
        raw: Some(true),
        smart: Some(false),
        recursive: Some(false),
        experimental: Some(false),
    };

    // Execute concurrently
    let (optimised_res, raw_res) = tokio::join!(
        execute_unified_search(&state.client, request_optimised),
        execute_unified_search(&state.client, request_raw)
    );

    let optimised = optimised_res.unwrap_or_default();
    let raw = raw_res.unwrap_or_default();

    Ok(Json(CompareResponse {
        query,
        meta: CompareMeta {
            optimised_count: optimised.len(),
            raw_count: raw.len(),
            time_ms: start_time.elapsed().as_millis() as u64,
        },
        optimised,
        raw,
    }))
}

#[cfg(feature = "web")]
async fn ws_search(
    Query(params): Query<SearchParams>,
    State(state): State<SharedState>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_ws(socket, state, params))
}

#[cfg(feature = "web")]
async fn handle_ws(mut socket: WebSocket, state: SharedState, _params: SearchParams) {
    while let Some(Ok(msg)) = socket.recv().await {
        if let Message::Text(text) = msg {
            #[derive(Deserialize)]
            struct WsPayload {
                #[serde(alias = "q")]
                query: Option<String>,
                categories: Option<Vec<String>>,
                limit: Option<u32>,
                smart: Option<bool>,
            }

            let (query_val, cats, limit_val, smart_val) =
                if let Ok(payload) = serde_json::from_str::<WsPayload>(&text) {
                    (
                        payload.query,
                        payload.categories,
                        payload.limit,
                        payload.smart,
                    )
                } else {
                    (Some(text.clone()), None, None, None)
                };

            if let Some(q) = query_val {
                if q.trim().is_empty() {
                    continue;
                }

                let _ = socket
                    .send(Message::Text(
                        r#"<div id="results" class="grid grid-cols-1 gap-4 max-w-5xl mx-auto"></div>"#
                            .to_string(),
                    ))
                    .await;

                let unified_args = UnifiedSearchArgs {
                    query: q,
                    categories: cats,
                    per_page: limit_val,
                    raw: Some(false),
                    smart: smart_val,
                    recursive: Some(true),
                    experimental: None,
                };

                match execute_unified_search(&state.client, unified_args).await {
                    Ok(results) => {
                        if results.is_empty() {
                            let _ = socket.send(Message::Text(r#"<div id="results" hx-swap-oob="beforeend"><div class="text-yellow-500 font-mono text-center p-4">NO_DATA_FOUND</div></div>"#.to_string())).await;
                        }
                        for result in results {
                            let html = format_result_html(&result);
                            let msg = format!(
                                r#"<div id="results" hx-swap-oob="beforeend">{}</div>"#,
                                html
                            );
                            if socket.send(Message::Text(msg)).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(e) => {
                        let _ = socket.send(Message::Text(format!("Error: {}", e))).await;
                    }
                }
            }
        }
    }
}

#[cfg(feature = "web")]
fn format_result_html(result: &SearchResult) -> String {
    let url = &result.url;
    let title = &result.title;
    let snippet = result.snippet.as_deref().unwrap_or("");
    let plain_text = snippet.replace("<", "&lt;").replace(">", "&gt;");

    // safe category handling
    let badge_class = match result.category {
        SearchCategory::Repositories => "badge-repo",
        SearchCategory::Code => "badge-code",
        SearchCategory::Issues => "badge-issue",
        SearchCategory::PullRequests => "badge-pr",
        SearchCategory::Users => "badge-user",
        SearchCategory::Discussions => "badge-discussion",
        SearchCategory::Commits => "badge-commit",
        SearchCategory::Packages => "badge-package",
        SearchCategory::Wikis => "badge-wiki",
        SearchCategory::Topics => "badge-topic",
        SearchCategory::Marketplace => "badge-marketplace",
        SearchCategory::Unified => "badge-unified",
    };
    let cat_name = format!("{:?}", result.category);

    format!(
        r#"
        <div class="result-card bg-gray-900/40 border border-gray-800 p-4 hover:border-gray-600 transition-colors group relative flex flex-col">
            <div class="flex justify-between items-start mb-2">
               <div class="flex flex-col gap-1">
                   <div class="flex items-center gap-2">
                        <span class="badge {badge_class}">{cat_name}</span>
                        <a href="{url}" target="_blank" class="text-neon-blue hover:text-white font-bold text-lg hover:underline break-all">{title}</a>
                   </div>
                   <div class="text-xs text-gray-400 font-mono">{url}</div>
               </div>
               <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Copy URL" onclick="copyToClipboard('{url}')">
                        📋
                    </button>
               </div>
            </div>
            <div class="code-snippet mt-auto bg-gray-950/50 p-2 rounded text-sm font-mono overflow-x-auto text-gray-300">
                <pre><code>{plain_text}</code></pre>
            </div>
            {footer}
        </div>
        "#,
        badge_class = badge_class,
        cat_name = cat_name,
        url = url,
        title = title,
        plain_text = plain_text,
        footer = if result.score_breakdown.context.abs() > 0.001 {
            format!(
                r#"<div class="mt-2 text-xs text-purple-400 flex items-center gap-1">✨ Context Boost: +{:.1}</div>"#,
                result.score_breakdown.context
            )
        } else {
            "".to_string()
        }
    )
}

// perform_smart_analysis moved to core implementation

#[cfg(feature = "web")]
#[derive(Serialize)]
struct MetricsResponse {
    dials: Vec<Dial>,
}
#[cfg(feature = "web")]
#[derive(Serialize)]
struct Dial {
    label: String,
    value: String,
    unit: String,
}

#[cfg(feature = "web")]
#[tracing::instrument]
async fn api_metrics() -> axum::Json<MetricsResponse> {
    let records = SelfImprover::load_lineage(std::path::Path::new(LINEAGE_LOG)).unwrap_or_default();
    let count = records.len();
    let mut total_latency = 0.0;

    for r in &records {
        if let Some(pos) = r.summary.find("latency=") {
            let part = &r.summary[pos + 8..];
            let num_str = part.split("ms").next().unwrap_or("0");
            if let Ok(v) = num_str.parse::<f64>() {
                total_latency += v;
            }
        }
    }

    let avg_latency = if count > 0 {
        total_latency / count as f64
    } else {
        0.0
    };

    axum::Json(MetricsResponse {
        dials: vec![
            Dial {
                label: "Total Queries".into(),
                value: count.to_string(),
                unit: "req".into(),
            },
            Dial {
                label: "Avg Latency".into(),
                value: format!("{:.2}", avg_latency),
                unit: "ms".into(),
            },
            Dial {
                label: "Discovery".into(),
                value: "0".into(),
                unit: "novelty".into(),
            },
        ],
    })
}

#[cfg(feature = "web")]
#[derive(Deserialize)]
struct SummarizeRequest {
    query: String,
}

#[cfg(feature = "web")]
async fn api_summarize(
    State(state): State<SharedState>,
    Json(payload): Json<SummarizeRequest>,
) -> impl IntoResponse {
    let request = SearchRequest {
        query: payload.query.clone(),
        categories: SearchCategory::defaults(),
        per_page: 8,
        raw: false,
        smart: false,
        recursive: false,
        experimental: false,
    };

    match state.client.search(request).await {
        Ok(results) => match state.llm_client.summarize(&payload.query, &results).await {
            Ok(summary) => (axum::http::StatusCode::OK, summary),
            Err(e) => (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("LLM Error: {}", e),
            ),
        },
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Search Error: {}", e),
        ),
    }
}
#[cfg(feature = "web")]
#[derive(Deserialize)]
struct ChatCompletionRequest {
    messages: Vec<ChatMessage>,
    #[serde(default)]
    _stream: bool,
}

#[cfg(feature = "web")]
#[derive(Deserialize, Serialize, Clone)]
struct ChatMessage {
    role: String,
    content: String,
}

#[cfg(feature = "web")]
#[derive(Serialize)]
struct ChatCompletionResponse {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<ChatChoice>,
}

#[cfg(feature = "web")]
#[derive(Serialize)]
struct ChatChoice {
    index: u32,
    message: ChatMessage,
    finish_reason: String,
}

#[cfg(feature = "web")]
async fn openai_chat_completions(
    State(state): State<SharedState>,
    Json(payload): Json<ChatCompletionRequest>,
) -> impl IntoResponse {
    // Extract the last user message as the search query
    let query = payload
        .messages
        .iter()
        .rev()
        .find(|m| m.role == "user")
        .map(|m| m.content.as_str())
        .unwrap_or("");

    if query.is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"error": "No user message found to use as query"})),
        )
            .into_response();
    }

    let search_req = SearchRequest {
        query: query.to_string(),
        categories: SearchCategory::defaults(),
        per_page: 5,
        raw: false,
        smart: true,
        recursive: false,
        experimental: false,
    };

    let results = state.client.search(search_req).await.unwrap_or_default();

    // Use the internal LLM client to generate a response in OpenAI format
    match state.llm_client.summarize(query, &results).await {
        Ok(summary) => {
            let response = ChatCompletionResponse {
                id: format!("gh-{}", uuid::Uuid::new_v4()),
                object: "chat.completion".into(),
                created: chrono::Utc::now().timestamp() as u64,
                model: "gh-search-plus".into(),
                choices: vec![ChatChoice {
                    index: 0,
                    message: ChatMessage {
                        role: "assistant".into(),
                        content: summary,
                    },
                    finish_reason: "stop".into(),
                }],
            };
            Json(response).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        )
            .into_response(),
    }
}
