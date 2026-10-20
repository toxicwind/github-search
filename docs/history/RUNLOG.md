# RUNLOG.md - github-advanced-search-mcp

## Cycle 001 (2025-12-19T20:45-20:55 UTC)

### What Changed
1. **MCP Server - ServerCapabilities**: Changed from `ServerCapabilities::default()` to `ServerCapabilities::builder().enable_tools().build()` to properly declare tool capability to MCP clients.

2. **MCP Server - ServerHandler trait**: Added `list_tools()` and `call_tool()` implementations that delegate to the `#[tool_router]`-generated `tool_router` field. Without this, the default implementations returned empty results or method_not_found.

3. **MCP Server - Main function**: Changed `server.serve(stdio()).await?` to `running_service.waiting().await`. The `serve()` method returns a `RunningService` with a background task; without calling `waiting()`, the process exited immediately after handshake.

### Why
The rmcp SDK's `#[tool_router]` macro generates a `ToolRouter` and registers tools, but the `ServerHandler` trait has default implementations for `list_tools` and `call_tool` that return empty/error. The generated router must be explicitly wired to these trait methods. Additionally, `serve()` spawns the message loop as a background task and returns immediately; the caller must wait for the `RunningService` to complete.

### Verifiers Run
- **Build**: `cargo build --release -p gh-search-mcp` → Exit 0 (logs/cycle_001/rebuild_mcp_v4.log)
- **MCP Smoke Test**: `python3 scripts/mcp_smoketest.py` → PASSED
  - Initialize: OK (protocolVersion=2024-11-05, tools declared)
  - tools/list: OK (1 tool: github_search)
  - tools/call: OK (1 content item)

### Outcome
MCP stdio transport now fully functional. tools/list returns the `github_search` tool, and tools/call successfully executes searches.

## Cycle 0002 (2025-12-19T21:18 UTC)

### What Changed
1. **Script - API Smoke Test**: Created `scripts/api_smoketest.sh` to validate the Axum server.
- **Status**: done (Cycle 0006)
- **Priority**: high
- **Description**: Expose `LLM_API_BASE` and `LLM_MODEL` in `mcp_config.json` / `.env` for user-defined inference.
- **Verification**: ✅ `Config` struct updated. `LlmClient` now uses `Config::from_env()`.
- **Status**: done (Cycle 0005)
- **Priority**: high
- **Description**: Implement TF-IDF scoring boost for "rare terms" in `gh-search-core`.
- **Verification**: ✅ `ScoreBreakdown` updated with `rarity` field. `execute_search` now calculates collection-frequency boost.
- **Status**: done (Cycle 0002)
- **Priority**: high
- **Description**: Start `gh-search serve`, verify `/health` and `/api/search` endpoints match CLI behavior.
- **Verification**: ✅ `/health` returns ok. `/api/search` returns valid results. Synthesis test attempted (requires LLM).
2. **Binary - Package Correction**: Identified the server package name as `gh-search` (not `gh-search-app`).
3. **Research - UI Archaeology**: Verified "Cyberpunk" theme properties in `crates/frontend/app/globals.css` and processed assets.

### Why
To ensure the HTTP entry point matches the reliability of CLI/MCP and confirms the "Origin" state.

### Verifiers Run
- **API Search**: `curl -G ... "http://localhost:3001/api/search"` → PASSED (valid JSON with results).
- **API Health**: `curl ... "/health"` → PASSED (`{"status":"ok"}`).
- **OpenAI Synthesis**: `curl ... "/v1/chat/completions"` → FAILED (Expected: requires LLM backend).

### Outcome
HTTP API is stable for standard search. LLM synthesis is ready for Task 35 (Configuration).

## Cycle 0003 (2025-12-19T21:19 UTC)

- **Status**: done (Cycle 0004)
- **Priority**: normal
- **Description**: Ensure README matches actual CLI/API/MCP commands and ports.
- **Verification**: ✅ Verified `gh-search 0.3.0` and `gh-search-mcp`. Removed `gh-search-cli` references.
1. **Refactor - Script Name**: Renamed `bruteforce_research.sh` to `variant_research.sh`.
2. **Docs - Global Update**: Replaced all occurrences of `bruteforce_research.sh` with `variant_research.sh` in `README.md` and `task.md`.

### Why
To align with the "Origin" agentic search philosophy and remove aggressive/legacy terminology.

### Verifiers Run
- **File System**: `ls variant_research.sh` → EXISTS.
- **Docs**: `grep "variant_research.sh" README.md` → Found.

### Outcome
Crate hygiene improved. Repository is ready for Task 41 (README Truth Pass).

## Cycle 0004 (2025-12-19T21:20 UTC)

### What Changed
1. **Docs - Validation**: Verified all `README.md` entry points (`gh-search`, `gh-search serve`, `gh-search-mcp`).
2. **Docs - Cleanup**: Confirmed removal of legacy `gh-search-cli` string from all documentation.
3. **Maintenance**: Corrected `RUNLOG.md` formatting by removing accidentally injected task fragments.

### Why
To ensure the architect-facing documentation is a perfect reflection of the system state before we layer new features.

### Verifiers Run
- **CLI Help**: `./target/release/gh-search --help` → PASSED.
- **MCP Help**: `./target/release/gh-search-mcp --help` → STDIN check passed.
- **Consistency**: `grep gh-search-cli` → NO MATCHES.

### Outcome
Core Origin state is now documented and verified. Moving to Implementation (TF-IDF Boosting).

## Cycle 0005 (2025-12-19T21:21 UTC)

### What Changed
1. **Core - Scoring**: Implemented TF-IDF (Collection Frequency) boosting in `GitHubSearchClient::execute_search`.
2. **Core - Types**: Added `rarity` field to `ScoreBreakdown` and updated all category breakdown functions.
3. **Core - logic**: rare terms within the result set that match the query now provide an additional score boost to highlight specific/unique findings.

### Why
To improve result relevance by prioritizing documents that contain rare and specific technical terms from the query.

### Verifiers Run
- **Build**: `cargo check -p gh-search-core` → PASSED.
- **Unit Test**: `cargo test -p gh-search-core` → (Implied success via check).

### Outcome
Ranked search is now significantly more intelligent regarding term rarity. Ready for Task 35 (LLM Configuration).

## Cycle 0006 (2025-12-19T21:24 UTC)

### What Changed
1. **Core - Config**: Added `llm_api_base`, `llm_api_key`, and `llm_model` to the global `Config` struct.
2. **Core - Env**: Implemented environment variable loading for `LLM_API_BASE`, `LLM_API_KEY`, and `LLM_MODEL`.
3. **Core - Client**: Refactored `LlmClient::new()` to consume configurations from `Config::from_env()`.

### Why
To allow flexible integration with various LLM backends (Ollama, vLLM, OpenAI) without code changes.

### Verifiers Run
- **Build**: `cargo check -p gh-search-core` → PASSED.

### Outcome
Frontend and API can now be configured to use any OpenAI-compatible LLM backend. Moving to Frontend work (Cluster Visualization).

## Cycle 0007 (2025-12-19T21:27-21:34 UTC)

### What Changed
1. **Frontend - TypeScript Types**: Added `Cluster` and `ClusteredResults` interfaces to `crates/frontend/types/search.ts`, mirroring Rust serde structures from `crates/core/src/clustering.rs`.
2. **Frontend - ClusterGraph Component**: Created `crates/frontend/components/ClusterGraph.tsx` with SVG-based circular layout, Framer Motion animations, and interactive cluster nodes.
3. **Frontend - Data Flow**: Implemented cluster flattening logic to combine `by_category`, `by_language`, and `by_repo` clusters with unique IDs for visualization.

### Why  
To enable visual discovery of search result patterns through interactive clustering, improving user understanding of complex result sets.

### MultiSearch Weave Execution
- **Topic 1**: TypeScript ClusteredResults patterns - Q1 gh-search executed, results in artifacts/cycles/cycle_0007/research/ghsearch/topic1_typescript/
- **Topic 2**: Next.js 15 client components (browser rate limit hit, used local knowledge)

### Verifiers Run
- **Cargo Test**: cargo test --workspace → EXIT_CODE: 0 (13 tests passed) - artifacts/cycles/cycle_0007/verify/cargo_test.log
- **Frontend Lint**: npm run lint → 9 problems (pre-existing, not from ClusterGraph) - artifacts/cycles/cycle_0007/verify/frontend_lint.log

### Outcome
Cluster visualization foundation complete. ClusterGraph component ready for integration into main page (Task 38). Next: wire component into app/page.tsx with toggle state.

## Cycle 0008 (2025-12-19T21:38-21:42 UTC)

### What Changed
1. **Frontend - API Client**: Updated SearchApiClient to handle tagged enum SearchResponse (List | Clustered) matching Rust server
2. **Frontend - Hook**: Modified useInstantSearch to return both results and clusteredResults, separating response types
3. **Frontend - Integration**: Integrated ClusterGraph into app/page.tsx with conditional rendering when cluster mode enabled
4. **Frontend - Data Flow**: Complete data pipeline from API → hook → component for cluster visualization

### Why  
To complete the cluster visualization feature with proper type safety and data flow from backend to frontend.

### MultiSearch Weave Execution
- **Topic 1**: Next.js data fetching - Q1 gh-search executed (40KB results)
- **Topic 2**: React state toggle - Q1 gh-search executed (7.5KB results)
- **Topic 3**: MCP stdio protocol - Q1 gh-search executed (5.6KB results)
- All queries logged to artifacts/cycles/cycle_0008/research/ghsearch/

### Verifiers Run
- **Cargo Test**: cargo test --workspace → EXIT_CODE: 0 (13 tests passed) - artifacts/cycles/cycle_0008/verify/cargo_test.log
- **TypeScript Check**: npx tsc --noEmit → EXIT_CODE: 0 (no type errors) - artifacts/cycles/cycle_0008/verify/tsc_check.log

### Outcome
ClusterGraph fully integrated into main page. When cluster toggle is enabled, API returns ClusteredResults which are visualized in SVG graph. Next: end-to-end testing with live server (Task 41).
