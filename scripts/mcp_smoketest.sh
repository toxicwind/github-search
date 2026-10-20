#!/usr/bin/env bash
# mcp_smoketest.sh - Verify MCP server stdio transport
# Usage: ./scripts/mcp_smoketest.sh [path_to_binary]
# Sends JSON-RPC initialize, tools/list, tools/call and checks responses.

set -euo pipefail

BINARY="${1:-./target/release/gh-search}"
LOGDIR="logs/mcp_smoke"
mkdir -p "$LOGDIR"

echo "=== MCP Smoke Test ==="
echo "Binary: $BINARY"
echo "Log Dir: $LOGDIR"

# Check binary exists
if [[ ! -x "$BINARY" ]]; then
  echo "FAIL: Binary not found or not executable: $BINARY"
  exit 1
fi

# Create JSON-RPC requests
INIT_REQ='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoketest","version":"1.0"}}}'
INIT_NOTIFY='{"jsonrpc":"2.0","method":"notifications/initialized"}'
LIST_REQ='{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
CALL_REQ='{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"github_search","arguments":{"query":"topic:mcp-server","per_page":1}}}'

# Run MCP server with all requests piped in
{
  echo "$INIT_REQ"
  sleep 0.2
  echo "$INIT_NOTIFY"
  sleep 0.2
  echo "$LIST_REQ"
  sleep 0.2
  echo "$CALL_REQ"
  sleep 1
} | timeout 30 "$BINARY" mcp 2>"$LOGDIR/stderr.log" | tee "$LOGDIR/stdout.log"

echo ""
echo "=== Checking Results ==="

# Check for initialize response
if grep -q '"protocolVersion"' "$LOGDIR/stdout.log"; then
  echo "✓ Initialize: OK"
else
  echo "✗ Initialize: FAIL (no protocolVersion in response)"
  exit 1
fi

# Check for tools/list response with tools array
if grep -q '"tools"' "$LOGDIR/stdout.log"; then
  TOOL_COUNT=$(grep -o '"name"' "$LOGDIR/stdout.log" | wc -l)
  echo "✓ tools/list: OK (found $TOOL_COUNT tool names)"
else
  echo "✗ tools/list: FAIL (no tools array in response)"
  exit 1
fi

# Check for tools/call response with content
if grep -q '"content"' "$LOGDIR/stdout.log"; then
  echo "✓ tools/call: OK (content field present)"
else
  echo "✗ tools/call: FAIL (no content in response)"
  exit 1
fi

echo ""
echo "=== MCP Smoke Test PASSED ==="
