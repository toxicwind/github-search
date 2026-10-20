#!/usr/bin/env zsh
# Quick launcher for "live control my Firefox" from the estate-scripts agent.
# Starts a dedicated headed Firefox that the playwright-mcp can attach to via remote endpoint.

set -e

MCP_FORK_DIR="${MCP_FORK_DIR:-/home/toxic/estate-maximal/mcp-forks/playwright-mcp}"
cd "$MCP_FORK_DIR"

echo "==> Starting controllable Firefox for estate-scripts agent (Playwright remote protocol)"
echo "    This is the Firefox equivalent of the Chromium CDP attach workflow."
echo ""
echo "After it prints the ws:// endpoint, configure your MCP client (or .grok/config.toml)"
echo "with --browser firefox --remote-endpoint <that-url>"
echo ""
echo "You can then do GitHub web things, etc. while already logged in (cookies from this profile)."
echo ""

exec node launch-firefox-remote.js "$@"
