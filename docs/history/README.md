# GitHub Advanced Search MCP

> Unified, production-grade GitHub search with regex expansion, shared rate limiting, and AI-aware tooling — all powered by one Rust core.

[![Rust](https://img.shields.io/badge/rust-1.70%2B-orange.svg)](https://www.rust-lang.org/)
[![Node](https://img.shields.io/badge/node-18%2B-6aa84f.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

<p align="center">
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-choose-your-interface">Interfaces</a> ·
  <a href="#-feature-highlights">Features</a> ·
  <a href="#-api-reference">API</a> ·
  <a href="#-project-layout">Structure</a>
</p>

---

## 🔭 Why Teams Use It

1. **Single Source of Truth** – Every interface (CLI, API, MCP, Web) calls the exact same `gh-search-core` crate, so features land once and ship everywhere simultaneously.
2. **Smart Request Orchestration** – A proactive queue tracks GitHub rate limits, controls concurrency, and keeps expansions + AI workloads fast without wasted calls.
3. **Regex-Aware Expansion** – `/async.*await/` becomes a curated bundle of literal queries, deduplicated and ranked so you surface patterns GitHub misses.
4. **Deep Integrations** – The CLI, HTTP API, MCP server, and Next.js frontend all ride on the same Rust client, enabling automation, human workflows, and AI agents with a shared vocabulary.

> ℹ️ Dive deeper in [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`CONSOLIDATION_REPORT.md`](./CONSOLIDATION_REPORT.md) for full design context.

---

## 🗺 Architecture Snapshot

All roads lead to the `gh-search-core` crate. Interfaces feed requests into the core client, which routes through the SmartRequestQueue, shared disk cache, and GitHub’s APIs.

![Architecture diagram showing unified core and interfaces](docs/architecture-overview.svg)

Mermaid source lives in [`docs/architecture-overview.mmd`](docs/architecture-overview.mmd) for easy edits or regenerating the SVG.

---

## 🚀 Quick Start

### 1. Prerequisites
- Rust **1.70+** (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Node.js **18+** for the Next.js frontend build
- GitHub Personal Access Token (strongly recommended for 5,000 req/hour vs 60 unauthenticated)

### 2. Install & Build Everything

```bash
git clone https://github.com/yourusername/github-advanced-search-mcp
cd github-advanced-search-mcp
./dev.sh all        # Builds Rust + MCP + frontend
./dev.sh verify     # Smoke-checks binaries, tokens, and artifacts
```

### 3. Configure Auth Once

```bash
export GITHUB_TOKEN="ghp_yourToken"
echo 'export GITHUB_TOKEN="ghp_yourToken"' >> ~/.bashrc
```

You now have a fully built CLI, HTTP server, MCP server, and static frontend bundle.

---

## 🔌 Choose Your Interface

| Interface | Command / Entry | Ideal For | Notes |
|-----------|-----------------|-----------|-------|
| **CLI** | `gh-search query "language:Rust async" --category code --limit 10` | Terminal workflows, scripting, CI | Supports JSON-only output via `--no-human`. |
| **Web UI + API** | `gh-search serve --port 3000` then visit `http://localhost:3000` | Visual exploration + programmatic API calls | Serves the Next.js build and exposes `/api/*` + `/ws/search`. |
| **MCP Server** | Add `mcp-wrapper.sh` to Claude Desktop, Antigravity, etc. | AI agents + IDE copilots | Provides the `github_search` tool via stdio. |

**API example**
```bash
curl "http://localhost:3000/api/search?query=language:Rust+async&categories=code&per_page=5"
```

---

## 💡 Feature Highlights

### Unified Core Architecture
```
gh-search-core (Rust)
    ├─→ CLI (gh-search)
    ├─→ HTTP API (gh-search serve)
    ├─→ MCP Server (gh-search-mcp)
    └─→ Web UI (Next.js via API)
```

- Shared structs, caching, and throttling eliminate drift.
- Smart migrations: add logic once in `crates/core` and every surface gets it.

### Smart Rate Limiting & Queueing
- Real-time tracking of GitHub’s `X-RateLimit-*` headers.
- Priority queues (Critical → Low) keep bursty workloads safe.
- Default concurrency: **10** authenticated / **3** unauthenticated.

| Remaining quota | Delay | Behavior |
|-----------------|-------|----------|
| > 20%           | 0s    | Full speed |
| 10–20%          | 1s    | Light throttle |
| 5–10%           | 5s    | Conservative |
| < 5%            | 10s   | Very conservative |
| 0%              | Wait  | Blocks until reset |

### Regex Pattern Expansion
```bash
gh-search query "/async.*await/" --category code
```
Expands strategic literal queries, deduplicates results, and scores findings so you capture naming variations (`asyncAwait`, `async.await`, etc.).

### Result Clustering & AI Hooks
- Cluster by repo/topic/language via `--cluster` or `?cluster=true`.
- `/api/summarize` + `/v1/chat/completions` expose OpenAI-compatible entrypoints using the shared LLM client.

---

## 🔍 API Reference

### `GET /api/search`
- `query` *(required)* – supports regex via `/pattern/`
- `categories` *(optional)* – e.g. `code,repo`
- `per_page` *(optional)* – per-category limit (default 10)
- `smart` *(optional)* – smart context discovery (default true)
- `cluster` *(optional)* – group related results (default false)

```json
{
  "List": [
    {
      "title": "repo/file.rs",
      "url": "https://github.com/...",
      "category": "code",
      "score": 95.2,
      "snippet": "async fn example() {...}",
      "highlights": ["async", "await"]
    }
  ]
}
```

### `GET /ws/search`
Streaming results over WebSockets.

### `POST /api/summarize`
```json
{ "query": "rust async patterns" }
```
Returns an LLM-authored summary of current search data.

### MCP Tool: `github_search`
```json
{
  "query": "language:Rust async",
  "categories": ["code"],
  "per_page": 10,
  "smart": true
}
```

---

## ⚙️ Configuration & Environment

```bash
export GITHUB_TOKEN="ghp_..."          # Required for >60 req/hr
export RUST_LOG=info                  # Optional logging level
export GH_SEARCH_LLM_MODE=1           # JSON-focused responses
export NEXT_PUBLIC_API_URL=http://... # Override API base for frontend
```

Full rate-limit hardening guide: [`.agent/workflows/fix-github-rate-limit.md`](./.agent/workflows/fix-github-rate-limit.md)

---

## 🧱 Project Layout

```
github-advanced-search-mcp/
├── crates/
│   ├── core/        # ⭐ Shared Rust library (search logic, queue, cache)
│   ├── app/         # CLI + HTTP server binaries
│   ├── mcp/         # MCP server binary
│   └── frontend/    # Next.js UI (built + served by gh-search serve)
├── dev.sh           # Unified build + verification script
├── scripts/         # Automation helpers (smoke tests, tooling)
├── ARCHITECTURE.md  # Deep dive diagrams + flows
└── README.md        # You're here
```

---

## 🛠 Development Workflow

```bash
./dev.sh all       # Build everything (Rust + frontend)
./dev.sh rust      # Rust crates only
./dev.sh frontend  # Next.js build only
./dev.sh test      # Run test suite
cargo test         # Rust unit tests
gh-search serve    # Start API + frontend
cd crates/frontend && NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev
```

Integration sanity check:

```bash
gh-search query "language:Rust async" --category code --limit 1
```

---

## 🤝 Contributing

1. Add new search logic in `crates/core`.
2. Extend CLI commands in `crates/app/src/main.rs`.
3. Add API routes in `crates/app/src/server.rs`.
4. Build UI components in `crates/frontend`.

All contributions automatically benefit every interface because they ride on the same Rust client.

---

## 📚 Further Reading

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – request flows, rate-limit internals, component map.
- [`DEVELOPMENT.md`](./DEVELOPMENT.md) – hacking tips and scripts.
- [`CONSOLIDATION_REPORT.md`](./CONSOLIDATION_REPORT.md) – context on the unified design decisions.

---

## 📜 License

MIT License – see [`LICENSE`](./LICENSE).
