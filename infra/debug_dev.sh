#!/bin/bash
# HYPEBRUT SHELL-OS — DEBUG DEV SCRIPT (Split Logs)
set -e

# Cleanup function (USER-ONLY, NO ROOT)
cleanup() {
    echo "Cleaning up processes..."
    pkill -f "gh-search-mcp" 2>/dev/null || true
    pkill -f "next-server" 2>/dev/null || true
    pkill -f "next-render" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
}

cleanup

echo "Starting Build..."
cargo build --release > infra/build.log 2>&1
echo "Build Complete. Log: infra/build.log"

echo "Starting MCP Server (Log: infra/mcp.log)..."
./target/release/gh-search-mcp --http --port 42305 > infra/mcp.log 2>&1 &
MCP_PID=$!

sleep 2

echo "Starting Frontend (Log: infra/frontend.log)..."
cd crates/frontend
# Force port again just in case, redirect stdout/stderr
PORT=42300 npm run dev > ../../infra/frontend.log 2>&1 &
FRONTEND_PID=$!

echo "Systems active. Logs split into infra/."
echo "MCP PID: $MCP_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait a bit to let logs populate
sleep 5
