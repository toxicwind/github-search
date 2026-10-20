#!/bin/bash
# Send initialize and then search_repositories request
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","method":"initialized","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_repositories","arguments":{"query":"DayZ killfeed real-time"}}}' | GITHUB_TOKEN=$(grep GITHUB_TOKEN .env | cut -d '=' -f2 | tr -d '"') python3 github-search-fastmcp.py
