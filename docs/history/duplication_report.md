# duplication_report.md

## Cluster: Docker Orchestration
- **Files**: `docker-compose.yml`, `infra/docker-compose.yml`
- **Difference**: Root version is most up-to-date with Python changes; `infra/` version appears legacy or environment-specific.
- **Action**: Merge necessary bits and archive/delete `infra/`.

## Cluster: Verification Scripts (Root)
- **Files**: `verify_fix.py`, `verify_godeye.py`, `verify_logic_direct.py`, `verify_parity.py`, `verify_python_mcp.py`, `test_auth.py`, `repro_error.py`.
- **Difference**: Each was created for a specific bug/cycle (e.g., auth fix, router fix).
- **Action**: Consolidate into `/tests` directory and merge into a unified `smoke_test.py`.

## Cluster: Documentation Overlap
- **Files**: `QUICK_FIX.md`, `ROOT_CAUSE_EXPLAINED.md`, `MCP_DIAGNOSIS.md`, `TASK_COMPLETION.md`.
- **Difference**: Fragments of repair history.
- **Action**: Consolidate into `/docs/history` or a single `LOGBOOK.md`.
