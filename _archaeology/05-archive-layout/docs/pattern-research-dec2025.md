# Pattern Improvements (Dec 2025 Research)

Research conducted via `hb research` CLI.

## Patterns Found

### 1. MCP Server State Pattern
From [jmagar/hive](https://github.com/jmagar/hive) (Nov 2025):

```rust
#[derive(Clone)]
pub struct McpServer {
    state: Arc<RwLock<ServerState>>,
}

#[derive(Default)]
struct ServerState {
    config: ServerConfig,
}
```

**Status:** ✅ We already use similar pattern with `GitHubSearchClient`

### 2. Rate Limiting (API Server)
```rust
pub struct RateLimiter {
    limits: Arc<RwLock<HashMap<String, RateLimitEntry>>>,
    max_requests: usize,
    window: Duration,
}
```

**Status:** ⚠️ Could add to `/api/search` endpoint

### 3. Production Hardening
- Rate limiting middleware
- Auth middleware
- Session management for HTTP MCP

**Status:** Future work for `gh-search serve`

## Recommendations

| Priority | Improvement | Effort |
|----------|-------------|--------|
| Low | Add rate limiting to API | Medium |
| Low | SSE streaming for large results | High |
| Already done | `#[tool_router]` pattern | ✅ |
| Already done | `--raw` passthrough | ✅ |

## Research Queries Used
```bash
hb research query "rmcp tool_router async Rust MCP 2025" -t code
hb research query "axum tower middleware rate limiting rust 2025" -t code
hb research query "GitHub search API rust caching 2025" -t code
```
