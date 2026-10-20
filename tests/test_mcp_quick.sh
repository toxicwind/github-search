#!/bin/bash
# Quick MCP Server Test - Bun MCP sidecar

set -e

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
MCP_ENTRY="${ROOT}/apps/mcp/src/server.ts"
export MCP_ENTRY
BUN_BIN="${BUN_BIN:-/home/toxic/.bun/bin/bun}"
export BUN_BIN
export GITHUB_TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

echo "=== MCP Server Quick Test ==="
echo ""
echo "1. Testing Bun MCP entry exists..."
if [ -f "$MCP_ENTRY" ]; then
    echo "   ✅ MCP entry found"
else
    echo "   ❌ MCP entry not found"
    exit 1
fi

if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "   ❌ GITHUB_TOKEN is missing"
    exit 1
fi

echo ""
echo "2. Testing MCP stdio protocol..."
python3 << 'PYEOF'
import subprocess, json, sys

import os
entry = os.environ["MCP_ENTRY"]
bun = os.environ["BUN_BIN"]
env = {"GITHUB_TOKEN": os.environ["GITHUB_TOKEN"]}

proc = subprocess.Popen([bun, "run", entry, "--mode", "stdio"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)

# Initialize
init = {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}}
proc.stdin.write((json.dumps(init) + "\n").encode())
proc.stdin.flush()

resp = json.loads(proc.stdout.readline())
print(f"   Server: {resp['result']['serverInfo']['name']} v{resp['result']['serverInfo']['version']}")

# Initialized notification
proc.stdin.write(b'{"jsonrpc":"2.0","method":"notifications/initialized"}\n')
proc.stdin.flush()

# List tools
list_tools = {"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
proc.stdin.write((json.dumps(list_tools) + "\n").encode())
proc.stdin.flush()

resp = json.loads(proc.stdout.readline())
tools = [t['name'] for t in resp['result']['tools']]
print(f"   Tools: {', '.join(tools)}")
print("   ✅ MCP protocol works")

proc.terminate()
PYEOF

echo ""
echo "=== ALL TESTS PASSED ✅ ==="
echo ""
echo "The MCP server is working correctly."
echo "Entry: ${MCP_ENTRY}"
