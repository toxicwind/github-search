#!/bin/bash
# Auto-reload wrapper for cargo build
# Usage: ./scripts/build_and_reload.sh

set -e

cd "$(dirname "$0")/.."

echo "🔨 Building MCP server..."
cargo build --release -p gh-search-mcp

echo ""
echo "🔄 Hot reloading..."
./scripts/mcp_hot_reload.sh

echo ""
echo "✅ Build and reload complete!"
