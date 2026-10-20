#!/usr/bin/env zsh
# "CDP-like" for Firefox: Launch (or takeover) your real daily Firefox profile
# under Playwright remote control so the estate-scripts MCP / github-advanced-search-mcp
# can drive it with full structured tools (snapshots, exact clicks, evaluate, etc.)
#
# This is the Firefox equivalent of:
#   npx @playwright/mcp --cdp-endpoint ws://...   for Chromium
#
# Usage:
#   ./launch-firefox-from-profile.sh [optional /path/to/firefox/profile]
#
# It will:
#   1. Try to gently close existing Firefox instances using that profile (or all).
#   2. Launch a new headed Firefox using that profile via Playwright's launchServer.
#   3. Print the ws:// endpoint you feed to estate-scripts-launch.js --remote-endpoint
#
# After this, in your MCP config or .grok/config:
#   PLAYWRIGHT_MCP_BROWSER=firefox PLAYWRIGHT_MCP_REMOTE_ENDPOINT=ws://... node estate-scripts-launch.js

set -euo pipefail

PROFILE_DIR="${1:-${FIREFOX_PROFILE_DIR:-}}"

if [[ -z "$PROFILE_DIR" ]]; then
  # Try common locations for the default profile
  for cand in \
    "$HOME/.mozilla/firefox"/*.default-release \
    "$HOME/.mozilla/firefox"/*.default \
    "$HOME/.mozilla/firefox"/*toxic* \
    "$HOME/.mozilla/firefox"/*work* \
    "$HOME/.mozilla/firefox"/*dev* ; do
    if [[ -d "$cand" ]]; then
      PROFILE_DIR="$cand"
      echo "[firefox-profile] Auto-detected profile: $PROFILE_DIR"
      break
    fi
  done
fi

if [[ -z "$PROFILE_DIR" || ! -d "$PROFILE_DIR" ]]; then
  echo "ERROR: Could not find a Firefox profile directory."
  echo "Pass it explicitly: $0 /home/you/.mozilla/firefox/xxxxx.default-release"
  exit 1
fi

echo "=== estate-scripts Firefox Profile Takeover Launcher ==="
echo "Profile : $PROFILE_DIR"
echo ""
echo "WARNING: This will close any running Firefox using this profile."
echo "Your current tabs/windows on this profile will be lost unless you have"
echo "session restore enabled (Firefox usually does)."
echo ""
echo "Press Ctrl-C in the next 4 seconds to abort..."
sleep 4

# Attempt to close Firefox instances gracefully (best effort on Hyprland/Linux)
echo "[firefox-profile] Attempting graceful close of Firefox processes..."
pkill -f "firefox.*$PROFILE_DIR" 2>/dev/null || true
sleep 1.5
pkill -f firefox 2>/dev/null || true   # last resort for the profile lock
sleep 2

# Now launch via the JS helper (which uses launchServer + the profile)
export FIREFOX_AGENT_PROFILE="$PROFILE_DIR"
node "$(dirname "$0")/launch-firefox-remote.js"
