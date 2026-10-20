#!/usr/bin/env bash
# scripts/api_smoketest.sh
# Validates the Axum-based HTTP API server.

set -euo pipefail

PORT=${PORT:-3001}
LOG_FILE="artifacts/cycles/cycle_0002/logs/api_server.log"
RESULTS_FILE="artifacts/cycles/cycle_0002/logs/api_results.jsonl"

echo "=== API Smoke Test Start: $(date) ===" | tee -a "$LOG_FILE"

# 1. Build & Start Server
echo "Building gh-search release..."
cargo build --release -p gh-search

echo "Starting server on port $PORT..."
./target/release/gh-search serve --port "$PORT" > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

trap "kill $SERVER_PID || true" EXIT

# Wait for server to be ready
MAX_RETRIES=10
RETRY_COUNT=0
while ! curl -s "http://localhost:$PORT/health" > /dev/null; do
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "FAIL: Server failed to start log:"
        cat "$LOG_FILE"
        exit 1
    fi
done

echo "✓ Server is up (/health)"

# 2. Test Health Endpoint
HEALTH=$(curl -s "http://localhost:$PORT/health")
echo "{\"endpoint\": \"/health\", \"response\": $HEALTH, \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$RESULTS_FILE"

# 3. Test Search Endpoint
echo "Testing /api/search..."
SEARCH=$(curl -s -G --data-urlencode "query=topic:mcp" --data-urlencode "per_page=1" "http://localhost:$PORT/api/search")
if echo "$SEARCH" | grep -q "results"; then
    echo "✓ /api/search: OK"
else
    echo "✗ /api/search: FAIL"
    echo "$SEARCH"
fi
echo "{\"endpoint\": \"/api/search\", \"response_summary\": \"$(echo "$SEARCH" | cut -c 1-100)...\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$RESULTS_FILE"

# 4. Test OpenAI-compatible Synthesis
echo "Testing /v1/chat/completions (Synthesis)..."
SYNTH=$(curl -s -X POST "http://localhost:$PORT/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gh-search",
    "messages": [{"role": "user", "content": "What is the MCP protocol?"}]
  }')

if echo "$SYNTH" | grep -q "choices"; then
    echo "✓ /v1/chat/completions: OK"
else
    echo "✗ /v1/chat/completions: FAIL (Might be expected if no LLM configured)"
    echo "$SYNTH"
fi
echo "{\"endpoint\": \"/v1/chat/completions\", \"response_summary\": \"$(echo "$SYNTH" | cut -c 1-100)...\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$RESULTS_FILE"

echo "=== API Smoke Test Complete ==="
