#!/bin/bash
# Autonomous watch and rebuild script for development
# Usage: ./watch-dev.sh

set -e

echo "🔄 Starting Docker Compose Watch Mode"
echo "======================================"
echo ""
echo "This will:"
echo "  - Build the development Docker image"
echo "  - Start the MCP server with hot-reload"
echo "  - Watch for file changes and auto-rebuild"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Export environment variables
export GITHUB_TOKEN="${GITHUB_TOKEN:-$(cat ~/.env 2>/dev/null | grep GITHUB_TOKEN | cut -d'=' -f2)}"
export BUILD_TARGET="development"
export RUST_LOG="${RUST_LOG:-info}"

# Start Docker Compose with watch mode
docker compose up --watch
