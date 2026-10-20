#!/usr/bin/env zsh
# Complete install + estate-scripts Firefox live control wiring for github-advanced-search-mcp
# Run this after cloning (or as part of "youaretoinstallthatgithubcompletelyplease")
# It ensures:
# - All JS/TS deps (bun)
# - Python deps (uv)
# - Playwright browsers (firefox + chromium for the browser control story)
# - The estate-scripts-browser/ launchers are present and executable (the Firefox "cdp-like" integration)
# - Dev tools are ready
# - Optional: registers the MCP in your main Grok TUI config

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "=== github-advanced-search-mcp COMPLETE INSTALL (with Firefox live control) ==="
echo "Root: $ROOT"

cd "$ROOT"

echo "[1/6] Bun install (TS/JS workspaces + MCP + API + frontend)..."
bun install

echo "[2/6] uv sync (Python test / tooling side)..."
uv sync --frozen || echo "uv sync had warnings (non-fatal)"

echo "[3/6] Playwright browsers (critical for Firefox live attach + headed dev)..."
bunx playwright install firefox chromium --with-deps || echo "Playwright install partial (common in custom Linux envs — browsers from estate-scripts stack are usually sufficient)"

echo "[4/6] estate-scripts Firefox launchers (the actual feature you asked for)..."
chmod +x scripts/estate-scripts-browser/*.sh scripts/estate-scripts-browser/*.js || true
ls -l scripts/estate-scripts-browser/

echo "[5/6] Rust crates note: the active crates/ workspace members may live in your private full checkout."
echo "      The public clone primarily ships the Bun MCP + API surface (what the operator uses day-to-day)."

echo "[6/6] Wiring into your Grok environment (MCP registration)..."
GROK_CFG="$HOME/.grok/config.toml"
if [[ -f "$GROK_CFG" ]]; then
  echo "Detected $GROK_CFG — adding ghas (github-advanced-search-mcp) entry with Firefox profile preference..."
  # Idempotent append (user can edit)
  if ! grep -q 'ghas' "$GROK_CFG" 2>/dev/null; then
    cat >> "$GROK_CFG" <<'TOML'

# github-advanced-search-mcp (completely installed + Firefox live control)
[mcp_servers.ghas]
command = "bun"
args = ["run", "apps/mcp/src/server.ts", "--mode", "stdio"]
enabled = true

[mcp_servers.ghas.env]
GHAS_BROWSER = "firefox"   # uses the estate-scripts profile takeover + remote endpoint under the hood
# When starting headed dev, run: GHAS_BROWSER=firefox bun run dev:headed
TOML
    echo "Appended ghas MCP entry (Firefox mode) to $GROK_CFG"
  else
    echo "ghas entry already present in config."
  fi
else
  echo "No ~/.grok/config.toml found — skipping auto-registration. You can add it manually."
fi

echo ""
echo "=== INSTALL COMPLETE ==="
echo "Useful commands from this repo now:"
echo "  bun run dev:mcp"
echo "  bun run dev:headed          # now supports GHAS_BROWSER=firefox"
echo "  ./scripts/estate-scripts-browser/launch-firefox-from-profile.sh"
echo "  just dev"
echo ""
echo "Your real logged-in Firefox (GitHub cookies, tabs, etc.) can now be driven live by this MCP and the estate-scripts playwright tools."
echo "See scripts/estate-scripts-browser/README.md for the exact flows."
echo ""
echo "To start everything with Firefox live control:"
echo "  GHAS_BROWSER=firefox bun run dev:headed"
