#!/bin/bash
# Bruteforce research of Antigravity MCP patterns
set -e

QUERIES=(
    "antigravity mcp_config.json example"
    "cortex ide mcp configuration"
    "mcpServers json schema"
    "custom mcp server stdio linux"
    "mcp_config.json environment variables"
    "antigravity mcp 'cwd' not allowed"
    "how to specify working directory mcp server"
    "docker based mcp server antigravity"
    "mcp-wrapper.sh patterns"
    "loading .env in mcp server"
    "gh-search-mcp configuration"
    "mcp protocol stdio transport linux"
    "antigravity mcp settings location"
    "claude desktop vs antigravity mcp"
    "mcp tool definition schema"
    "antigravity cortex mcp server initialize"
    "mcp_config.json absolute path vs relative"
    "using $HOME in mcp_config.js"
    "antigravity developer guide mcp"
    "mcp-server-github config"
)

OUT="bruteforce_report.md"
echo "# Bruteforce Research Report" > "$OUT"
echo "Generated on $(date)" >> "$OUT"

for q in "${QUERIES[@]}"; do
    echo "## Researching: $q" >> "$OUT"
    ./target/release/gh-search query "$q" --limit 5 --no-human >> "$OUT"
    echo -e "\n---\n" >> "$OUT"
done

echo "Research complete. Output in $OUT"
