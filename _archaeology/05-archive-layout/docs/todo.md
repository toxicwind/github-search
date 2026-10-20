# Maximal System Audit & TODO
> Status as of December 23, 2025 (Cycle 2/10)

## 🚨 Critical System Status
- **Overall Health**: 🟡 TRANSITIONAL
- **Unification**: Partially Consolidated
- **Emergence**: Active (Graph Analysis Tool added)
- **Environment**: Native MCP (No shell wrappers)

## 🧠 Active "Brain" Context
We are currently in the middle of a **"Recursive Hop"** strategy. We have moved from a baseline MCP integration to a "Native RMCP" integration, and we have just added the first "Emergent" capability (`github_graph_analysis`). The next major phase is to **Unify** the disparate parts of this repository (Frontend, CLI, MCP) into a cohesive "Super-IDE".

## 📂 Project Structure Audit
**Root**: `/home/toxic/development/github-advanced-search-mcp`

### 1. Core Engine (`crates/core`)
- [x] **Basics**: `GitHubSearchClient`, `SearchResult`, `SearchRequest`.
- [x] **Logic**: Rate limiting, basic scoring, regex expansion.
- [ ] **Data Persistence**: `IncrementalCache` is in-memory only? Need verification.
- [ ] **Advanced Cycles**: `dependency_graph` exists but is isolated. `ml_ranker`, `semantic`, etc. are stubs or partially integrated.

### 2. MCP Interface (`crates/mcp`)
- [x] **Protocol**: Uses `rmcp` v0.10.0 (Native).
- [x] **Transport**: Stdio mainly, HTTP gateway exists in code but unused in config.
- [x] **Tools**:
    - `github_search` (Primary) - **STABLE**
    - `github_graph_analysis` (Emergent) - **BETA** (Naive variable matching)
- [ ] **Logging**: `tracing` set up to `stderr`, good.

### 3. Frontend (`crates/frontend` & others)
- [x] **Messy State**: Consolidated frontends. Legacy and Backup versions moved to `archive/`.
- [x] **Integration**: Next.js app is the primary frontend.
- [ ] **Connect Frontend to MCP**: Ensure the Next.js app can actually *call* the MCP tools (via a client or bridge).
- [ ] **Auth**: "Auth Extensions" mentioned in history but not visible in this repo audit.

### 4. Docker & Infra
- [x] `mcp.Dockerfile`: Builds 18MB image. **OPTIMIZED**.
- [ ] `docker-compose.yml`: Needs review to ensure it launches the *new* binary.

---

## 📝 TODO List

### Phase 1: Robustness & Unification (Completed)
- [x] **Consolidate Frontend**: Deleted `frontend-legacy` and `frontend-cyber-backup` references.
- [x] **Fully Integrate 10 Cycles**: Wired all 10 modules into `UnifiedSearchEngine`.
- [x] **Unified Pipeline**: GitHubSearchClient now delegates to the Unified Engine.

### Phase 2: "Cycles" Deepening (Completed)
- [x] **Graph Analysis v2**:
    - Upgraded `github_graph_analysis` from naive string matching to actual `tree-sitter` parsing for true dependency detection.
    - Implemented `CodeGraphAnalyzer` with cursor-based AST traversal.
    - Detects imports, function calls, and trait implementations.
    - Generates Mermaid diagrams with graph statistics.
- [ ] **Cycle 3: Self-Correction**: Implement the `autonomous_fixer` loop where the MCP calls *itself* or an LLM to fix 0-result queries.
- [ ] **Cycle 4: Semantic Search**: Integrate `qdrant` or a local vector store for semantic relatedness (beyond regex).

### Phase 3: "Antigravity" Integration (Meta)
- [ ] **Auth Audit**: Investigate the "Authentication Extensions" mentioned in previous sessions. Are they in a different repo?
- [ ] **Recursive Workflow**: Create a workflow `.md` that defines how the agent should "hop" into this repo to add features autonomously.

### Phase 4: DayZ / Personal Extensions (User Specific)
- [ ] **Legacy Cleanups**: The "DayZ Dashboard" and "Discord Bot" seem to be in different contexts. Confirm if they need to move *into* this monorepo or stay separate.

## 📉 Debt & Risks
- **Duplicate Code**: `crates/app` (CLI) vs `crates/mcp` (Server). They share `core` but might have divergent logic in `main.rs`.
- **Testing Gap**: We have smoke tests for MCP but low unit test coverage for the complex scoring logic in `core`.

## ✅ Next Immediate Action
- **Frontend Consolidation**: The existence of 3 frontend folders is a major confusion point. We need to pick one and kill the others.
