# repo_map.md

## Tree Snapshot (2025-12-25)
```
/home/toxic/development/github-advanced-search-mcp
├── .env                  # Token storage
├── Dockerfile            # Python-based (Current)
├── docker-compose.yml    # Root orchestrator
├── github-search-fastmcp.py # Primary Python entrypoint (God-Eye Router)
├── crates/               # Legacy Rust implementation
├── scripts/              # Operational scripts (some redundant)
├── infra/                # Secondary docker-compose (overlap with root)
├── logs/                 # Cycle-specific execution logs
├── reports/              # Extensive historical reports and handoffs
└── Root Scripts          # Many verify_*.py and repro_*.py files
```

## Detected Subsystems
1. **Python MCP Server**: The current active server (`github-search-fastmcp.py`).
2. **Rust MCP Server (Legacy)**: In `crates/`, likely used before the Python migration.
3. **Verification Suite**: A large collection of `verify_*.py`, `test_*.sh`, and `scripts/` for testing GitHub API parity.
4. **DevOps/Infra**: Dockerfiles and compose files in both root and `infra/`.
5. **Knowledge/Docs**: High volume of `*.md` files tracking "cycles" and "fixes".

## Entrypoints
- **CLI/Server**: `github-search-fastmcp.py`
- **Docker**: `docker-compose.yml` (Root)
- **Dev Tools**: `watch-dev.sh`, `justfile`

## Known Facts
- The project migrated from Rust to Python FastMCP recently.
- There are multiple overlapping `docker-compose.yml` files (root vs `infra/`).
- Root is cluttered with ~15+ single-purpose verification scripts.

## Open Questions
- Is the Rust code in `crates/` still needed for reference or should it be archived?
- Why is there an `infra/` folder with another `docker-compose.yml`?
- Can we consolidate the 10+ verification scripts into a single test suite?
