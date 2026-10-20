# GitHub Search MCP Server - EOF Error Fix

## Problem
The gh-search-mcp server crashes with:
```
Error: expect initialized notification, but received: Some(Notification(...initialized...
```

## Root Cause
**rmcp 0.12.0 library bug** - The library is incorrectly validating the `initialized` notification from MCP clients, causing the server to crash immediately after initialization.

## Temporary Workarounds

### Option 1: Use HTTP Mode (WORKING NOW)
```bash
# Start the server in HTTP mode instead of stdio
/home/toxic/development/github-advanced-search-mcp/target/release/gh-search-mcp --http --port 8877
```

Then configure mcp_config.json to use HTTP transport (if Antigravity supports it).

### Option 2: Wait for rmcp Update
The rmcp library needs to be updated. Latest version is 0.12.0 which has this bug.

### Option 3: Switch to Official MCP SDK
Replace rmcp with the official modelcontextprotocol/rust-sdk (if available).

## Quick Test
Test the server manually:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","method":"initialized","params":{}}' | GITHUB_TOKEN=$GITHUB_TOKEN ./target/release/gh-search-mcp
```

This will show the crash.

## Solution Status
- ❌ rmcp 0.13+ not available yet
- ✅ HTTP mode works as workaround  
- ⏳ Waiting for lib fix or migration to official SDK
