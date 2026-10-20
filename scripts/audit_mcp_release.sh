#!/bin/bash
# audit_mcp_release.sh
# Verifies the Release binary of the MCP server.

BINARY="./target/release/gh-search-mcp"
echo ">> Auditing Binary: $BINARY"

if [ ! -f "$BINARY" ]; then
    echo "❌ Error: Release binary not found. Run 'just run' first."
    exit 1
fi

# Request Sequence: Initialize -> Initialized -> Call Tool
# We use a piped python script to manage the conversation or just simplified cat chain if possible.
# Actually, the server keeps running. We need to keep the pipe open.

# Create a temporary input file
INPUT_PIPE="/tmp/mcp_input_$$"
mkfifo "$INPUT_PIPE"

# Request 1: Initialize
REQ_INIT='{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "audit-script", "version": "1.0"}}}'

# Request 2: Initialized Notification
REQ_NOTIFY='{"jsonrpc": "2.0", "method": "notifications/initialized"}'

# Request 3: Call Tool
REQ_TOOL='{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "github_search", "arguments": {"query": "rust async executor"}}}'

echo ">> Sending Handshake & Request..."
START=$(date +%s%N)

# Feed valid JSON-RPC sequence
(
    echo "$REQ_INIT"
    sleep 0.1
    echo "$REQ_NOTIFY"
    sleep 0.1
    echo "$REQ_TOOL"
    sleep 2
    # Keep pipe open to prevent premature EOF
    sleep 10
) > "$INPUT_PIPE" &

# Run server with input from pipe
RESPONSE=$($BINARY < "$INPUT_PIPE" 2>/tmp/mcp_audit.log)
END=$(date +%s%N)
rm "$INPUT_PIPE"
DURATION=$(( ($END - $START) / 1000000 ))

echo ">> Duration: ${DURATION}ms"
echo ">> Response Preview:"
echo "$RESPONSE" | head -c 200
echo "..."

# Checks
if echo "$RESPONSE" | grep -q "content"; then
    echo "✅ Success: Response contains content."
    if [ "$DURATION" -lt 2000 ]; then # 2s allowance for cold start model
         echo "✅ Performance: Response < 2s (${DURATION}ms)"
    else
         echo "⚠️ Performance: Response > 2s (${DURATION}ms) - Cold start?"
    fi
else
    echo "❌ Failure: Invalid response."
    cat /tmp/mcp_audit.log
    exit 1
fi
