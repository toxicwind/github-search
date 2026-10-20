# repo_map.md

## Tree Snapshot (2025-12-25) - Route B
```
/home/toxic/development/github-advanced-search-mcp
├── apps/
│   ├── mcp-server/         # ⭐ Python God-Eye Entrypoint (main.py)
│   ├── web-frontend/       # ⭐ Next.js UI (React 19)
│   └── legacy-rust/        # Rust CLI/API Apps
├── libs/
│   ├── rust-core/          # Shared search & queue logic
│   ├── tree-sitter-rust/   # Parser bindings
│   └── codegraph-rust/     # Graph logic
├── tests/                  # Unified Test Suite (e2e_test.py)
├── infra/                  # DevOps (Dockerfile, docker-compose)
├── docs/                   # Architecture & History
├── .env                    # Secrets
├── docker-compose.yml -> infra/docker-compose.yml
└── Dockerfile -> infra/Dockerfile
```

## Subsystems
1. **Unified Search (Python)**: The primary MCP interface.
2. **Web Suite (Next.js)**: Modern frontend for visual search.
3. **Rust Engine**: The high-performance core used for complex logic.

## Entrypoints
- **Terminal (MCP)**: `python3 apps/mcp-server/main.py`
- **Container**: `docker compose up`
- **E2E Test**: `python3 tests/e2e_test.py`
