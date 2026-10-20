#!/bin/bash
# MCP Server Hot Reload Script
# Kills old instances and ensures the latest binary is used

set -e

PROJECT_ROOT="/home/toxic/development/github-advanced-search-mcp"
BINARY="$PROJECT_ROOT/target/release/gh-search"

echo "🔄 MCP Server Hot Reload"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Kill all old instances
echo "🔪 Killing old MCP server instances..."
pkill -9 -f "gh-search mcp" 2>/dev/null || true
sleep 1

# Verify they're dead
if pgrep -f "gh-search mcp" > /dev/null; then
    echo "❌ ERROR: Failed to kill all instances"
    ps aux | grep "gh-search mcp" | grep -v grep
    exit 1
fi
echo "✅ All old instances killed"

# Step 2: Verify binary exists and is recent
if [ ! -f "$BINARY" ]; then
    echo "❌ ERROR: Binary not found at $BINARY"
    exit 1
fi

BINARY_AGE=$(stat -c %Y "$BINARY")
CURRENT_TIME=$(date +%s)
AGE_MINUTES=$(( ($CURRENT_TIME - $BINARY_AGE) / 60 ))

echo "📦 Binary info:"
echo "   Path: $BINARY"
echo "   Size: $(du -h $BINARY | cut -f1)"
echo "   Age: ${AGE_MINUTES} minutes old"
echo "   Modified: $(stat -c %y $BINARY | cut -d'.' -f1)"

if [ $AGE_MINUTES -gt 60 ]; then
    echo "⚠️  WARNING: Binary is >60 minutes old - consider rebuilding"
fi

# Step 3: Update MCP config to ensure correct path
CONFIG_FILE="/home/toxic/antigravity-white/home/.gemini/antigravity/mcp_config.json"
if [ -f "$CONFIG_FILE" ]; then
    echo "✅ MCP config found: $CONFIG_FILE"
    CONFIGURED_PATH=$(jq -r '.mcpServers."github-advanced-search".command' "$CONFIG_FILE")
    if [ "$CONFIGURED_PATH" != "$BINARY" ]; then
        echo "⚠️  WARNING: Config points to different binary:"
        echo "   Config: $CONFIGURED_PATH"
        echo "   Actual: $BINARY"
    fi
else
    echo "⚠️  WARNING: MCP config not found at $CONFIG_FILE"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Hot reload complete!"
echo ""
echo "Next steps:"
echo "  1. The MCP client will auto-spawn fresh instances on next request"
echo "  2. Or manually test: echo '{...}' | $BINARY"
echo ""
echo "To rebuild and reload:"
echo "  cargo build --release && $0"
