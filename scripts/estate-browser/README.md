# estate-scripts Firefox Live Control (CDP-like for Firefox)

This directory contains the launchers so that the github-advanced-search-mcp (and the broader estate-scripts stack) can drive a **real user Firefox session** the same way the Chromium side uses `--cdp-endpoint` against a live rebrowser/Browserless pool.

## Two modes

### 1. Full structured control (recommended, Playwright remote)
Use when you are willing to (re)launch Firefox under agent control (you said this is acceptable).

- `launch-firefox-from-profile.sh` — finds or takes over your real daily profile, kills conflicting Firefox, launches via `launchServer` so the MCP gets a real `ws://` endpoint.
- Then run the estate-scripts playwright MCP with `--browser firefox --remote-endpoint ws://...`

After that the normal `browser_click`, `browser_evaluate`, accessibility snapshots, etc. all work against your real logged-in GitHub tabs, advanced search pages, etc.

See the parent playwright-mcp fork README for the exact MCP config snippets.

### 2. Zero-restart "nudge whatever is open right now"
Uses `hyprctl` + `ydotool` (Hyprland native) to focus a specific Firefox window by address and inject keyboard events (space / 'k' for YouTube, etc.).

Useful for quick actions on tabs you already have open without closing anything.

Demonstrated live on a playing YouTube video in the architect's actual Firefox.

## Integration points

These launchers are symlinked/copied from the main estate-scripts playwright-mcp fork so they stay in sync.

Typical flow from within this repo or the agent:

```bash
cd scripts/estate-scripts-browser
./launch-firefox-from-profile.sh     # or the remote one
# copy the printed ws:// endpoint
```

Then configure your MCP client (or `.grok/config.toml`) to start the playwright MCP in Firefox remote mode.

This gives the github-advanced-search-mcp browser-using flows (and OpenClaw etc.) a true "live Firefox you are already logged into" experience, symmetric to the Chromium CDP path used elsewhere in the estate-scripts setup.
