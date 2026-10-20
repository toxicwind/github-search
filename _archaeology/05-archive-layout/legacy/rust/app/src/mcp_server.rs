//! MCP Server for GitHub Advanced Search
//!
//! Integrated into main binary for unified functionality.
use anyhow::Result;
use gh_search_core::orchestrator::{execute_unified_search, UnifiedSearchArgs};
use gh_search_core::{GitHubSearchClient, SearchCategory, SearchRequest};
use rmcp::{
    handler::server::tool::ToolRouter,
    handler::server::wrapper::Parameters,
    model::{
        CallToolResult, Content, Implementation, InitializeResult, ProtocolVersion,
        ServerCapabilities,
    },
    tool, tool_router,
    transport::stdio,
    ErrorData as McpError, ServerHandler, ServiceExt,
};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Clone)]
pub struct GitHubSearchServer {
    client: GitHubSearchClient,
    #[allow(dead_code)] // Used internally by #[tool_router] macro
    tool_router: ToolRouter<Self>,
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct SearchArgs {
    /// The primary search query. Supports GitHub advanced syntax (e.g., 'language:rust parallel').
    /// Regex patterns can be enclosed in slashes (e.g., '/async.*await/').
    pub query: String,

    /// Categories to search. Defaults to ['code'] if empty.
    /// Values: 'repositories', 'code', 'issues', 'users'.
    #[serde(default)]
    pub categories: Option<Vec<String>>,

    /// Maximum results to return per category.
    /// Recommended range: 1 to 50.
    #[serde(default)]
    pub per_page: Option<u32>,

    /// If true, returns results exactly as they come from GitHub API without applying
    /// custom relevance boosting or readability scoring. Useful for baseline comparisons.
    #[serde(default)]
    pub raw: Option<bool>,

    /// Enable 'Smart Mode' to automatically discover connected files (e.g., imports, dependencies).
    /// This may trigger additional non-blocking network requests.
    #[serde(default)]
    pub smart: Option<bool>,

    /// Enable 'recursive' swarm search to fallback/fracture queries when no results are found.
    #[serde(default)]
    pub recursive: Option<bool>,

    /// If true, use the experimental heuristic-heavy ranker (BM25, identifier splits, popularity).
    #[serde(default)]
    pub experimental: Option<bool>,

    /// If true, performs dependency graph analysis on the search results.
    /// This detects 'use' statements and potential connections using tree-sitter.
    #[serde(default)]
    pub analyze: Option<bool>,

    /// Depth of the graph analysis (default: 1). Only used if 'analyze' is true.
    #[serde(default)]
    pub analyze_depth: Option<u32>,
}

#[tool_router]
impl GitHubSearchServer {
    fn new(token: Option<String>) -> Self {
        Self {
            client: GitHubSearchClient::new(token),
            tool_router: Self::tool_router(),
        }
    }

    /// Search GitHub with HYPEBRUT "Smart Mode" (Orchestrated).
    /// Automatically fractures queries, discovery links, and applies custom rankers.
    #[tool(
        description = "Smart Search: Automatically fractures queries, discovers links, and ranks results. Use for broad research."
    )]
    async fn github_search(
        &self,
        params: Parameters<SearchArgs>,
    ) -> Result<CallToolResult, McpError> {
        let args = params.0;

        let unified_args = UnifiedSearchArgs {
            query: args.query.clone(),
            categories: args.categories,
            per_page: args.per_page,
            raw: args.raw,
            smart: args.smart,
            recursive: args.recursive,
            experimental: args.experimental,
        };

        // TIMEOUT WRAPPER (User Request: "break after 3s")
        let timeout = std::time::Duration::from_secs(3);
        let search_future = async { execute_unified_search(&self.client, unified_args).await };

        let results = match tokio::time::timeout(timeout, search_future).await {
            Ok(Ok(res)) => res,
            Ok(Err(e)) => return Err(McpError::internal_error(e.to_string(), None)),
            Err(_) => {
                // Return a PARTIAL/DEBUG response so user sees the timeout
                let debug_msg = format!(
                    "⚠️ SEARCH TIMEOUT (3s Limit Exceeded) ⚠️\n\n\
                    The search took longer than 3 seconds and was aborted.\n\
                    Trace ID: {}\n\
                    Query: {}\n\
                    Debug: Check networking or increase timeout if recursive mode is deep.",
                    uuid::Uuid::new_v4(), // generate a fake trace ID for reference
                    args.query
                );
                return Ok(CallToolResult::success(vec![Content::text(debug_msg)]));
            }
        };

        let mut output_text = serde_json::to_string_pretty(&results)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        // Dependency Analysis (Folded from legacy github_graph_analysis)
        if args.analyze.unwrap_or(false) {
            if let Ok(mut analyzer) = gh_search_core::code_graph::CodeGraphAnalyzer::new() {
                let code_results: Vec<_> = results
                    .iter()
                    .filter(|r| r.category == gh_search_core::SearchCategory::Code)
                    .collect();

                let snippets: Vec<(String, String)> = code_results
                    .iter()
                    .filter_map(|r| {
                        r.snippet.as_ref().map(|s| {
                            let name = r.subtitle.as_deref().unwrap_or("unknown").to_string();
                            (name, s.clone())
                        })
                    })
                    .collect();

                let graph = analyzer.build_graph(&snippets, args.analyze_depth);
                if !graph.is_empty() {
                    output_text.push_str("\n\n---\n## Dependency Graph Analysis");
                    if let Some(depth) = args.analyze_depth {
                        output_text.push_str(&format!(" (Depth: {})\n", depth));
                    } else {
                        output_text.push_str(" (Depth: Default)\n");
                    }
                    output_text.push_str(&analyzer.to_mermaid(&graph));
                }
            }
        }

        Ok(CallToolResult::success(vec![Content::text(output_text)]))
    }

    /// Targeted search for specific categories without orchestration or fracturing.
    /// Fast and precise for known targets.
    #[tool(
        description = "Raw Search: Targeted, category-specific search without automatic fracturing or smart-mode overhead."
    )]
    async fn github_search_raw(
        &self,
        params: Parameters<SearchArgs>,
    ) -> Result<CallToolResult, McpError> {
        let args = params.0;

        let unified_args = UnifiedSearchArgs {
            query: args.query,
            categories: args.categories,
            per_page: args.per_page,
            raw: Some(true),
            smart: Some(false),
            recursive: Some(false),
            experimental: args.experimental,
        };

        let results = execute_unified_search(&self.client, unified_args)
            .await
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        let json = serde_json::to_string_pretty(&results)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        Ok(CallToolResult::success(vec![Content::text(json)]))
    }
}

impl ServerHandler for GitHubSearchServer {
    fn get_info(&self) -> InitializeResult {
        InitializeResult {
            protocol_version: ProtocolVersion::LATEST,
            capabilities: ServerCapabilities::builder().enable_tools().build(),
            server_info: Implementation {
                name: "github-advanced-search".into(),
                version: env!("CARGO_PKG_VERSION").into(),
                ..Default::default()
            },
            instructions: Some(
                "Use 'github_search' for broad discovery (Smart Mode). Use 'github_search_raw' for fast, targeted category lookups.".into(),
            ),
        }
    }

    fn list_tools(
        &self,
        _request: Option<rmcp::model::PaginatedRequestParam>,
        _context: rmcp::service::RequestContext<rmcp::service::RoleServer>,
    ) -> impl std::future::Future<Output = Result<rmcp::model::ListToolsResult, rmcp::ErrorData>>
           + Send
           + '_ {
        let tools = self.tool_router.list_all();
        std::future::ready(Ok(rmcp::model::ListToolsResult {
            tools,
            next_cursor: None,
            meta: None,
        }))
    }

    #[allow(clippy::manual_async_fn)]
    fn call_tool(
        &self,
        request: rmcp::model::CallToolRequestParam,
        context: rmcp::service::RequestContext<rmcp::service::RoleServer>,
    ) -> impl std::future::Future<Output = Result<rmcp::model::CallToolResult, rmcp::ErrorData>>
           + Send
           + '_ {
        async move {
            let tool_context =
                rmcp::handler::server::tool::ToolCallContext::new(self, request, context);
            self.tool_router.call(tool_context).await
        }
    }
}

use axum::{
    extract::{Query, State},
    http::{Method, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use tower_http::cors::{Any, CorsLayer};

/// HTTP Handler bridging Axum -> MCP Tool
async fn http_search(
    State(server): State<GitHubSearchServer>,
    Query(params): Query<SearchArgs>,
) -> impl IntoResponse {
    let categories = params
        .categories
        .clone()
        .unwrap_or_else(|| vec!["code".to_string()])
        .into_iter()
        .filter_map(|c| match c.to_lowercase().as_str() {
            "repositories" | "repo" => Some(SearchCategory::Repositories),
            "code" => Some(SearchCategory::Code),
            "issues" | "issue" => Some(SearchCategory::Issues),
            "users" | "user" => Some(SearchCategory::Users),
            _ => None,
        })
        .collect();

    let request = SearchRequest {
        query: params.query.clone(),
        categories,
        per_page: params.per_page.unwrap_or(10),
        raw: params.raw.unwrap_or(false),
        smart: params.smart.unwrap_or(false),
        recursive: params.recursive.unwrap_or(true), // Default to recursive true for HTTP API (frontend)
        experimental: params.experimental.unwrap_or(false),
    };

    match server.client.search(request).await {
        Ok(results) => Json(results).into_response(),
        Err(e) => {
            eprintln!("Search error: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn run_mcp_server(token: Option<String>) -> Result<()> {
    load_env();

    let token = token.or_else(|| std::env::var("GITHUB_TOKEN").ok());
    if let Some(ref t) = token {
        eprintln!("gh-search: ✓ GITHUB_TOKEN loaded (len: {})", t.len());
    } else {
        eprintln!("gh-search: ⚠️  GITHUB_TOKEN NOT FOUND. Rates will be severely limited.");
        eprintln!(
            "gh-search: Please ensure GITHUB_TOKEN is set in .env or exported in your shell."
        );
    }

    // GHOST LOG: Launch Self-Healing Monitor
    let logs = vec![
        PathBuf::from("infra/frontend.log"),
        PathBuf::from("infra/mcp.log"),
    ];
    let monitor = gh_search_core::ghost_log::GhostLogMonitor::new(logs);
    monitor.start().await;

    let server = GitHubSearchServer::new(token);

    eprintln!("gh-search: 🔌 Starting MCP Server (Stdio)");
    let running_service = server.serve(stdio()).await?;
    let _ = running_service.waiting().await;

    Ok(())
}

pub async fn run_mcp_http_server(token: Option<String>, host: String, port: u16) -> Result<()> {
    load_env();

    let token = token.or_else(|| std::env::var("GITHUB_TOKEN").ok());
    if let Some(ref t) = token {
        eprintln!("gh-search: ✓ GITHUB_TOKEN loaded (len: {})", t.len());
    } else {
        eprintln!("gh-search: ⚠️  GITHUB_TOKEN NOT FOUND. Rates will be severely limited.");
    }

    let server = GitHubSearchServer::new(token);

    eprintln!(
        "gh-search: 🌐 Starting MCP HTTP Gateway on {}:{}",
        host, port
    );

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/search", get(http_search))
        .layer(cors)
        .with_state(server);

    let addr = format!("{}:{}", host, port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn load_env() {
    if let Ok(explicit) = std::env::var("GH_SEARCH_CONFIG_FILE") {
        let _ = dotenvy::from_filename(explicit);
        return;
    }

    if dotenvy::dotenv().is_ok() {
        return;
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidates = [
                exe_dir.join(".env"),
                exe_dir.join("..").join(".env"),
                exe_dir.join("..").join("..").join(".env"),
            ];
            for candidate in candidates {
                if dotenvy::from_filename(&candidate).is_ok() {
                    return;
                }
            }
        }
    }
}
