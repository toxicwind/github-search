# State Model: GitHub Advanced Search MCP

**Version**: 1.0
**Enforcement**: Strict Isolation

## 1. Configuration State
The application MUST NOT implicitly read from global user configuration (`~/.config/...`) unless explicitly directed.

**Sources of Truth (Priority Order):**
1.  **CLI Argument**: `--config-file <PATH>`
2.  **Environment Variables**: `GITHUB_TOKEN`, `GH_SEARCH_*`
3.  **Defaults**: Hardcoded safe defaults.

**Prohibited:**
- Reading `~/.env` or `./.env` implicitly (handled via `dotenvy` if restricted to loaded config file only? The tool currently calls `dotenvy::dotenv()` which scans. This MUST be removed/refactored).

## 2. Runtime State (Cache/Data)
The application maintains local state for caching search results and rate limits.

**Locations:**
- **Linux**: `$XDG_CACHE_HOME/gh-search` or `~/.cache/gh-search`
- **Override**: `GH_SEARCH_CACHE_DIR` env var (if implemented).

**Isolation Rule:**
Tests MUST set `XDG_CACHE_HOME` to a temporary directory to avoid polluting the host cache.

## 3. Network IO
The application connects to `api.github.com`.

**Isolation Rule:**
Tests MUST use `--mock` (or `GH_MOCK_MODE=1`) to prevent latent network requests.
When Mock Mode is verify-able, no network traffic is generated.

## 4. Output
- **Stdout**: JSON (machine) or Human Readable (terminal).
- **Stderr**: Logs/Tracing.
