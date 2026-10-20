#!/bin/bash
set -e

# HYPEBRUT SHELL-OS — UNIFIED DEV SCRIPT (v2025.1)
# RE-ROUTED PORTS: FRONTEND (42300), MCP (42305)

# Function to kill processes on a port
function kill_port() {
    local port=$1
    if lsof -i :$port > /dev/null; then
        echo "Killing process on port $port..."
        kill -9 $(lsof -t -i :$port)
    fi
}

# Kill conflicting ports
kill_port 42300
kill_port 42305

# Build the project
echo "Building Rust Project..."
cargo build --release

# Start the MCP Server
echo "Starting MCP Server on 42305..."
./target/release/gh-search-mcp --http --port 42305 &
MCP_PID=$!

# Wait for MCP to start
sleep 2

# Start the Frontend
echo "Starting Frontend on 42300..."
cd crates/frontend
PORT=42300 npm run dev
