#!/bin/bash
# cleanup_protocol.sh (The Janitor)
# "December 2025" Standard

set -e

echo ">> Initiating Cleanup Protocol..."

# 1. Create Archive
mkdir -p _legacy_archive

# 2. Move Legacy Artifacts
# Move files matching patterns, suppress error if none found
mv temp_* _legacy_archive/ 2>/dev/null || true
mv old_* _legacy_archive/ 2>/dev/null || true
mv *.bak _legacy_archive/ 2>/dev/null || true

# 3. Purge Caches
echo ">> Purging Caches..."
rm -rf __pycache__
rm -rf .DS_Store
rm -rf .mypy_cache

# 4. Privilege Escalation (System Link)
echo "Linking MCP..."
# Attempt sudo, fallback to mock if fails (non-interactive check)
if command -v sudo >/dev/null 2>&1; then
    # Try to execute a dummy sudo command to see if we have pw-less sudo or are root
    if sudo -n true 2>/dev/null; then
        sudo ln -sf "$(pwd)/mcp_server" /usr/local/bin/mcp-server
        echo ">> System link created at /usr/local/bin/mcp-server"
    else
        echo ">> [MOCK] sudo requires password or not available. Skipping link."
    fi
else
    echo ">> [MOCK] sudo not found. Skipping link."
fi

echo ">> Cleanup Complete."
