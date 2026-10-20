# GHAS MCP Transport Fix — Plan

## Context / What We Were Doing

This is the **toxicwind fork** of `github-advanced-search-mcp` (repo: `toxicwind/github-advanced-search-mcp`),
a GitHub Advanced Search MCP server that exposes ~25 search tools through both REST API
(ports from `estate-scripts/config/ports.env`: `GHAS_API_PORT=25112`, `GHAS_MCP_PORT=25113`,
`GHAS_FRONTEND_PORT=25114`) and an MCP over Streamable HTTP endpoint (`/mcp`, port 25113).

The MCP server is dispatched/used by `pi-agent` (the `toxicwind/pi` fork) and `mcpproxy`
(toxicwind fork, port 25109) which federates it to pi.

## Root Cause of "broken" GHAS MCP

`apps/mcp/src/server.ts` was rewritten to use the SDK's
`WebStandardStreamableHTTPServerTransport`. That transport:
1. On a **POST /mcp initialize**, requires `Accept: application/json, text/event-stream`
   (line 377-380 of webStandardStreamableHttp.js).
2. mcpproxy's streamable-http client sends only `Accept: application/json` on the init
   POST → transport returns **406 Not Acceptable: "Client must accept both
   application/json and text/event-stream"**.
3. mcpproxy logs: `MCP initialize JSON-RPC call failed ... likely a legacy SSE server`.
4. Result: **0 tools surface through mcpproxy**, even though the GHAS API health (25112)
   and the MCP subprocess (25113 via `/api/mcp/status`) report `running: true`.

This is a server-side Accept-header negotiation bug in the transport, not a port bug.
The user phrase was "ports in mcpconfig prob wrong" but the real issue is the transport's
strict Accept check rejects mcpproxy's standard-compliant init POST.

## Secondary: "Broadcaster agent is set as main"

Not actually a config bug. The `pi-vault-mind` identity-injector detects the loaded
skill (`vault-mind-*` in `systemPromptOptions.skills`) and injects a capability boundary:
- `vault-mind-broadcaster` → Broadcaster (read/write/edit + vm_search, NO bash)
- `vault-mind-manager`     → Manager (all vm_* + publish + dispatch, NO bash)
- `vault-mind-heavy-lifter`→ Heavy-Lifter (read/write/edit + bash/grep/find + vm_search,
  NO vm_append/vm_sync, NO publish, NO sub-agents)

The "main" collection is just the default ledger collection (`collections/main.jsonl`).
The user wants **Heavy-Lifter** as the default agent identity (it has bash + all tools,
which is what's needed to fix real infra like this). The fix is to ensure pi loads the
`vault-mind-heavy-lifter` skill by default.

## Fix — Custom "July 2026 grade" real-streaming MCP transport

Replace the SDK's `WebStandardStreamableHTTPServerTransport` with a hand-written
Streamable HTTP transport in `apps/mcp/src/mcp-transport.ts` that properly implements
the MCP Streamable HTTP spec (2025-06-18 / 2025-03-26):

- **POST /mcp**: accepts JSON-RPC. `Accept: application/json` is sufficient for the
  response (returns JSON, not SSE) — fixes the 406. On initialize, returns
  `Mcp-Session-Id` header and `Protocol-Version`. Subsequent calls must include the
  session id; otherwise 401/404.
- **GET /mcp** with `Accept: text/event-stream` + `Mcp-Session-Id`: opens a real SSE
  stream and pushes streamed JSON-RPC responses / tool progress as SSE events.
- **DELETE /mcp** with `Mcp-Session-Id`: closes the session, returns 200.
- Per-session message queues so streamed tool responses are delivered as SSE.
- Works on Bun `Bun.serve` (pure Web Standard Request/Response — no Node req/res).
- Hot reload already ON via `bun --hot run apps/mcp/src/server.ts --mode http`.

## Steps

1. Write `apps/mcp/src/mcp-transport.ts` — the custom streaming transport.
2. Rewrite `apps/mcp/src/server.ts` to use it (keep stdio path intact).
3. Restart the GHAS MCP daemon under pitchfork (`mise run up-ghas-api`).
4. Verify via mcpproxy: `tools/list` over 25109 returns GHAS tools; init POST no longer 406.
5. Make Heavy-Lifter the default pi identity.
6. Capture a GHAS search result as proof the end-to-end chain works.

## Files
- `apps/mcp/src/mcp-transport.ts` (new)
- `apps/mcp/src/server.ts` (rewrite transport wiring)
- `estate-scripts/pitchfork.toml` (if daemon restart needed)
