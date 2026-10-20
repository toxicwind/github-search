#!/usr/bin/env bash
# Export GHAS tool schemas into Grok/Cursor MCP descriptor cache.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${GROK_MCP_DESCRIPTORS:-$HOME/.grok/projects/home-toxic-crypto-workspace/mcps/ghas/tools}"
mkdir -p "$DEST"

cd "$ROOT"
TOOLS_JSON=$(bun -e "
import { GHAS_TOOLS } from './apps/mcp/src/tools.ts';
console.log(JSON.stringify(GHAS_TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))));
")

count=0
while IFS= read -r line; do
  name=$(echo "$line" | jq -r '.name')
  echo "$line" | jq '{name, description, inputSchema}' > "$DEST/${name}.json"
  count=$((count + 1))
done < <(echo "$TOOLS_JSON" | jq -c '.[]')

echo "Synced $count tools to $DEST"
ls "$DEST" | wc -l