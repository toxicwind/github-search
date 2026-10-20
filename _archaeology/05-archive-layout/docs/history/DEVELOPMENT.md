# Development Guide - GitHub Advanced Search MCP

## Local Workflow

The project is designed for rapid local development with hot-reload capabilities.

### 1. Prerequisites

- **Rust**: 1.83+ (Stable)
- **Node.js**: 20+ (for frontend)
- **Just**: `cargo install just` (optional but recommended)
- **Cargo Watch**: `cargo install cargo-watch`

### 2. Environment Setup

```bash
export GITHUB_TOKEN=ghp_...
export AG_SESSION_ID=dev-$(date +%s)
export RUST_LOG=info,gh_search=debug
```

### 3. Hot Reload (Fast Iteration)

Use `just watch` to start the backend server with `cargo-watch`. Any change to the Rust source files (in `crates/`) will trigger an automatic rebuild and restart.

```bash
just watch
```

The server will be available at `http://localhost:8877`.

### 4. Testing Endpoints

#### Health Check
```bash
curl http://localhost:8877/health
# Status: ok, version, uptime
```

#### Search API
```bash
curl "http://localhost:8877/api/search?q=rust&categories=repo"
```

### 5. Frontend Development

The frontend is a Next.js application located in `crates/frontend`.

```bash
cd crates/frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:3000` and proxies API requests to the Rust backend.

### 6. Logging & Tracing

Structured logs include the `AG_SESSION_ID` if set, allowing you to trace requests across the system.

```bash
AG_SESSION_ID=chris-test cargo run --bin gh-search -- serve
```

### 7. MCP Verification

To test the MCP server locally without an LLM:

```bash
echo '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}, "id": 1}' | cargo run --bin gh-search-mcp --quiet
```
