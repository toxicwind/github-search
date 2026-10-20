#!/bin/bash
set -u

BINARY="./target/release/gh-search"
PORT=9966
LOG_FILE="reports/cycle_014/server.log"

# Kill any existing server on port
fuser -k $PORT/tcp 2>/dev/null

echo "Starting Server on port $PORT..."
GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN must be set in the environment}"
SERVER_PID=$!

# Wait for boot
sleep 2

FAILURES=0

# Test 1: Health Check
echo -n "Test 1 (Health): "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/health)
if [ "$HTTP_CODE" == "200" ]; then
    echo "PASS"
else
    echo "FAIL ($HTTP_CODE)"
    FAILURES=$((FAILURES + 1))
fi

# Test 2: Search API (requires token, using alias q)
echo -n "Test 2 (Search q=): "
# Expect valid JSON array containing "category"
RESP=$(curl -s "http://localhost:$PORT/api/search?q=query&limit=1")
if echo "$RESP" | grep -q "category"; then
    echo "PASS"
else
    echo "FAIL (Response: ${RESP:0:50}...)"
    FAILURES=$((FAILURES + 1))
fi

# Cleanup
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null

exit $FAILURES
