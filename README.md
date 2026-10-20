# github-advanced-search-mcp

> **TOXICWIND FORK** — Autonomous high-recall GitHub search client, API server, Next.js frontend, and Model Context Protocol (MCP) server.

## Stack

- `apps/frontend`: Next.js UI (`:25114`)
- `apps/api`: Bun API/control plane (`:25112`)
- `apps/mcp`: MCP service (`:25113`) with stdio + HTTP modes
- `packages/github-client`: Direct GitHub search client with multi-category expand, cache, retry, and rescue logic

## Runtime Contract (estate-scripts Ports)

```text
Frontend: http://127.0.0.1:25114
API:      http://127.0.0.1:25112
MCP:      http://127.0.0.1:25113
```

## Local Dev

```bash
bun install
bun run dev:mcp
bun run dev:api
cd apps/frontend && bun run dev
```

Hot reload loop for all surfaces:

```bash
bun run dev:headed
```

**With live Firefox control** (the full estate-scripts integration added on complete install):

```bash
GHAS_BROWSER=firefox bun run dev:headed
# or
just firefox-dev
# or the direct profile takeover
./scripts/estate-scripts-browser/launch-firefox-from-profile.sh
```

One-command complete install (deps + Python + Playwright + Firefox launchers + Grok MCP wiring):

```bash
./scripts/install-complete.sh
```

Or from Apex operator:

```bash
/home/toxic/.config/niri/apex-operator/bin/apex ghas up
/home/toxic/.config/niri/apex-operator/bin/apex ghas status
```

## API Surface

- `GET /api/health`
- `GET /api/stack/status`
- `GET /api/search`
- `POST /api/search/expand`
- `GET /api/compare`
- `POST /api/mcp/query`
- `GET /api/mcp/status`
- `POST /api/mcp/restart`
- `GET /api/logs/{api|mcp|frontend}`

## Search Behavior

`/api/search` supports:

- `backend=hybrid|mcp|api`
- `strict=true|false`
- `categories=...`
- `per_page=N`
- `experimental=true|false`

The fork includes rescue behavior in `packages/github-client` to recover low-yield strict searches by expanding category/query probes and cache fallback.

## MCP Mode

HTTP:

```bash
bun run apps/mcp/src/server.ts --mode http
```

stdio:

```bash
bun run apps/mcp/src/server.ts --mode stdio
```

Tools:

- `github_search`
- `github_compare`

## Fork Notes

- This fork is tuned for operator workflows and high-frequency query chains.
- It is integrated as a first-class MCP server in Apex (`mcp_servers.ghas`).
- Private by default; hardening and cleanup are in progress before public release.

## License

MIT
