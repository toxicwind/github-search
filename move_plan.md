# move_plan.md

## Pillar Definition
1. **Core**: The Python MCP server and its dependencies.
2. **Infrastructure**: Docker and environment configs.
3. **Tests/Tools**: Verification scripts and utilities.
4. **Legacy/Archive**: Rust code and historical logs/scripts.
5. **Documentation**: Architectural and historical docs.

## Route Selection
- **Route A (Conservative)**: Keep everything in root or archive. (Rejected - user says it's ridiculous)
- **Route B (Workspace Restoration)**: Organically group by `apps/`, `libs/`, `infra/`, and `tests/`. (Chosen)

## Target Structure (Route B)
```
/root
├── apps/
│   ├── mcp-server/         # Unified Python God-Eye
│   ├── web-frontend/       # restored Next.js app
│   └── legacy-rust/        # historical Rust apps
├── libs/
│   ├── rust-core/          # shared Rust library
│   └── tree-sitter-rust/   # shared parsers
├── tests/                  # Unified verification suite
├── infra/                  # Docker, Justfile, configs
├── docs/                   # Human documentation
└── .env, requirements.txt, etc.
```

## Staged Moves (Route B)
1. **Restore Pillars**: Move frontends and crates out of `archive/` into `apps/` and `libs/`.
2. **Standardize MCP**: Move `src/github_search_mcp.py` to `apps/mcp-server/main.py`.
3. **Internalize External**: Move `external/*` to `libs/`.
4. **Fix Symlinks**: Ensure root `docker-compose.yml` and `Dockerfile` work for all apps.
5. **E2E Verify**: Run the consolidated test suite.
