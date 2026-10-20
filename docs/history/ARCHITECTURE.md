# GitHub Advanced Search MCP - Unified Architecture

## 🎯 CORE PRINCIPLE: ONE SOURCE OF TRUTH

**All components use the SAME `gh-search-core` crate**

```
gh-search-core (Rust)
    ├─→ CLI (`gh-search query "..."`)
    ├─→ API Server (`gh-search serve`)
    ├─→ MCP Server (`gh-search-mcp`)
    └─→ Frontend (via HTTP API)
```

---

## 📦 Component Integration Map

### Layer 1: Core Library (`crates/core`)
**Purpose**: Single source of truth for GitHub search logic

**Contains**:
- `GitHubSearchClient` - GitHub API client with rate limiting
- `SmartRequestQueue` - Rate limit tracking and throttling  
- `SearchRequest`/`SearchResult` - Shared data types
- `regex_expander` - Pattern expansion
- `swarm_discovery` - Emergent logic (Swarm), Recursive search, and Deep Void detection
- `regex_filter` - Strict Regex verification engine
- `clustering` - Result grouping
- `rate_limiter` - Smart queue system
- `LlmClient` - AI-powered features

**Used By**: ALL other components

---

### Layer 2: Interfaces (How to Access Core)

#### A. CLI (`crates/app` → binary: `gh-search`)

**Commands**:
```bash
# Direct query
gh-search query "language:Rust mcp" --category code --limit 20

# Start API server (serves frontend + API)
gh-search serve --port 3000
```

**Use Case**: Human-friendly terminal interface, shell scripts

#### B. API Server (`crates/app/src/server.rs`)

**Started by**: `gh-search serve`

**Endpoints**:
- `GET /api/search?query=...&categories=...` - JSON search API
- `GET /ws/search` - WebSocket streaming
- `GET /api/metrics` - Usage statistics  
- `POST /api/summarize` - LLM summarization
- `POST /v1/chat/completions` - OpenAI-compatible endpoint
- `GET /` - Serves Next.js frontend (from `crates/frontend/out/`)

**Use Case**: Web UI, API integrations, frontend

#### C. MCP Server (`crates/mcp` → binary: `gh-search-mcp`)

**Protocol**: Model Context Protocol (stdio) OR HTTP (Dual-Mode)

**Tools**:
- `github_search` - Search with advanced query syntax

**Dual-Mode Capability**:
- **Stdio Mode**: Default, for AI agents (Claude, Antigravity)
- **HTTP Mode**: `gh-search-mcp --http --port 8877` - Serves Frontend requests directly
- **Why?** Allows the Frontend to bypass the `gh-search` serve binary and talk directly to the MCP logic if needed, or primarily for development testing of MCP-native features.

**Use Case**: AI agents (Claude, Antigravity), IDE integrations, Frontend (Development)

**Started by**: MCP clients via `mcp-wrapper.sh`

---

### Layer 3: Frontend (`crates/frontend` → Next.js)

**Technology**: Next.js 15, TypeScript, TailwindCSS

**Philosophy**: **Thin Client / Thick Backend**
- The frontend has stripped most complex logic (e.g., regex parsing, swarm recursion).
- It relies on the Backend to perform:
    - `recursive=true` swarm searches
    - Strict regex filtering (returning `REGEX_UNMATCHED` vs `REGEX_VERIFIED`)
    - Deep Void detection (generating `OPPORTUNITY_DETECTED` cards)

**Integration**: 
```typescript
// crates/frontend/lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
    || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8877');
```

**Build Process**:
```bash
cd crates/frontend
npm run build  # → outputs to crates/frontend/out/
```

**Served by**: `gh-search serve` automatically embeds and serves the built frontend

**Use Case**: Visual search interface, human exploration

---

## 🔄 Request Flow Examples

### Example 1: Frontend Search

```
User types in browser
    ↓
Frontend (Next.js in browser)
    ↓ HTTP GET /api/search?query=...
API Server (gh-search serve)
    ↓ calls
GitHubSearchClient (gh-search-core)
    ↓ SmartRequestQueue
GitHub API (with rate limiting)
    ↓ response
Results → Frontend
```

### Example 2: CLI Search

```
$ gh-search query "rust async"
    ↓
CLI parser (clap)
    ↓ calls
GitHubSearchClient (gh-search-core)
    ↓ SmartRequestQueue
GitHub API
    ↓ response
Markdown output to terminal
```

### Example 3: MCP/Agent Search

```
Claude Desktop / Antigravity
    ↓ MCP protocol (stdio)
gh-search-mcp server
    ↓ calls
GitHubSearchClient (gh-search-core)
    ↓ SmartRequestQueue
GitHub API
    ↓ response
JSON → MCP client → AI agent
```

---

## 🧩 Why This Makes Sense

### Single Core = Consistency

All search features are identical across:
- CLI query results
- API JSON responses  
- MCP tool returns
- Frontend search results

### Shared Rate Limiting

The `SmartRequestQueue` ensures EVERY interface respects GitHub rate limits:
- CLI rapid queries → throttled
- API burst traffic → throttled
- MCP agent loops → throttled
- All tracked from same GitHub token

> Tip: You can override the maximum concurrency used for outgoing GitHub requests via environment variable `GH_SEARCH_MAX_CONCURRENT`. Set it to a small value (e.g. `GH_SEARCH_MAX_CONCURRENT=2`) to be conservative when you are testing or when tokens are shared.

### Zero Duplication

**Before** (hypothetical bad design):
- Frontend: Custom GitHub fetch in TypeScript
- CLI: Rust GitHub client
- MCP: Another GitHub client
→ **3 different implementations, 3 different rate limiters**

**After** (current):
- Everyone uses `gh-search-core`
→ **1 implementation, 1 rate limiter, 1 source of truth**

---

## 🏗️ Development Workflows

### Build Everything
```bash
# Build Rust binaries (CLI, MCP, API server)
cargo build --release

# Build frontend
cd crates/frontend && npm run build && cd ../..
```

### Run Modes

**Mode 1: Development (separate)**
```bash
# Terminal 1: API server
cargo run --bin gh-search -- serve --port 3000

# Terminal 2: Frontend dev server (hot reload)
cd crates/frontend && npm run dev

# Frontend uses NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Mode 2: Production (unified)**
```bash
# Build frontend first
cd crates/frontend && npm run build && cd ../..

# Start unified server (serves API + built frontend)
cargo run --release --bin gh-search -- serve --port 3000

# Visit http://localhost:3000 → Frontend + API in one!
```

**Mode 3: MCP only**
```bash
# Add to Antigravity MCP config
{
  "gh-search-mcp": {
    "command": "/path/to/mcp-wrapper.sh",
    "args": []
  }
}
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    gh-search-core                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │         GitHubSearchClient                       │  │
│  │  ┌─────────────────────────────────────────┐     │  │
│  │  │   SmartRequestQueue                     │     │  │
│  │  │   - Rate limit tracking                  │     │  │
│  │  │   - Priority-based throttling            │     │  │
│  │  │   - Concurrency control                  │     │  │
│  │  └─────────────────────────────────────────┘     │  │
│  │  ┌─────────────────────────────────────────┐     │  │
│  │  │   Swarm Discovery & Regex               │     │  │
│  │  │   - Recursive Fallback                  │     │  │
│  │  │   - Strict Pattern Matching             │     │  │
│  │  │   - Deep Void Detection                 │     │  │
│  │  └─────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
              ▲             ▲              ▲
              │             │              │
     ┌────────┴────┐  ┌─────┴──────┐ ┌────┴─────┐
     │  CLI        │  │ API Server │ │ MCP      │
     │  (gh-search)│  │ (Axum)     │ │ (Dual)   │
     └─────────────┘  └────────────┘ └──────────┘
                            │               ▲
                      ┌─────┴──────┐        │
                      │  Frontend  │────────┘
                      │  (Next.js) │ (Dev Mode)
                      └────────────┘
```

---

## 🔧 Configuration

### Environment Variables (Shared by All)

```bash
# Required for >60 req/hr
export GITHUB_TOKEN="ghp_..."

# Optional (used by all components)
export GH_SEARCH_LLM_MODE=1         # JSON output mode
export RUST_LOG=info                 # Tracing level
````

All components read from:
1. `.env` file (via `dotenvy`)
2. Environment variables
3. `~/.bashrc` exports (via `mcp-wrapper.sh`)

---

## 🎨 Frontend-Specific Notes

### Why Next.js Lives in `crates/frontend`?

**Historical**: Workspace organization (all components in `crates/`)

**Future**: Could move to `frontend/` at root level

### Current Build Integration

1. Frontend builds to `crates/frontend/out/` (static export)
2. Rust server embeds this via `rust-embed`:
   ```rust
   #[derive(RustEmbed)]
   #[folder = "../frontend/out/"]
   struct Asset;
   ```
3. API server serves at `/` and proxies API at `/api/*`

### API Client Configuration

```typescript
// Automatically uses server it's served from
const API_BASE_URL = 
    process.env.NEXT_PUBLIC_API_URL ||  // Dev override
    window.location.origin;              // Production (gh-search serve)
```

---

## 🚀 Recommended Usage

### For Development:
```bash
# Start API server
cargo run --bin gh-search -- serve --port 3000

# In another terminal: Frontend hot reload
cd crates/frontend && NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev
```

### For Production/Testing:
```bash
# Build everything
cd crates/frontend && npm run build && cd ../..
cargo build --release

# Run unified server
./target/release/gh-search serve --port 8877
```

### For AI Agents (MCP):
```bash
# Runs automatically via MCP config
# Uses gh-search-core internally
```

### For Scripts:
```bash
# Direct CLI
gh-search query "language:Python asyncio" --category code --limit 5 --no-human
```

---

## 🎯 Key Takeaway

**There is NO disconnect!**

All components use the **SAME core Rust library** (`gh-search-core`).

The "disconnect" feeling comes from:
1. **Multiple entry points** (CLI, API, MCP) - this is INTENTIONAL for flexibility
2. **Frontend in different language** (TypeScript) - this is NORMAL for web UIs
3. **API sits in the middle** - this is the BRIDGE connecting Rust ↔ Frontend

**This is actually GOOD architecture:**
- Core logic: Rust (fast, safe, shared)
- Interfaces: Multiple (CLI, HTTP, MCP)
- Frontend: Web tech (accessible, visual)

**The integration IS deep** - all roads lead to `gh-search-core`.
