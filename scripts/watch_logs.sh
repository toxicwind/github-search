#!/bin/bash
# Diagnostic log watcher for Antigravity Frontend
# Monitors for common React/Next.js runtime errors after page load

LOG_FILE="/home/toxic/antigravity-white/logs/terminal_session.log"

echo ">>> Starting Antigravity Frontend Diagnostic Watcher..."
echo ">>> Monitoring: $LOG_FILE"
echo ">>> (Press Ctrl+C to stop)"

# Tail the log file and look for specific error patterns
tail -f "$LOG_FILE" | grep --line-buffered -E "ReferenceError|TypeError|Error:|500 \(Internal Server Error\)|Unhandled Runtime Error" | while read -r line; do
    echo -e "\033[0;31m[DETECTION]\033[0m $line"
done
