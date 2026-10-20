#!/usr/bin/env bash
# GHAS MCP launcher — loads home secrets + GitHub web session before stdio.
# Grok/Antigravity don't source ~/.zshrc; dual-engine Blackbird needs user_session.
set -euo pipefail

HOME="${HOME:-/home/toxic}"

# 1) Master secrets (GH_TOKEN / GITHUB_TOKEN / etc.)
if [[ -f "${HOME}/.secrets" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${HOME}/.secrets"
  set +a
fi

# 2) GitHub web session for Blackbird (path:** / UI index). Prefer refresh if missing.
WEB_ENV="${HOME}/.config/estate-scripts/github-web-session.env"
REFRESH="${HOME}/.local/bin/ghas-refresh-github-session.sh"
if [[ ! -f "$WEB_ENV" && -x "$REFRESH" ]]; then
  "$REFRESH" >/dev/null 2>&1 || true
fi
if [[ -f "$WEB_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$WEB_ENV"
  set +a
fi

# 3) Dual-engine default: auto → Blackbird for path:** / path: when session; REST keeps filename:
export GHAS_CODE_ENGINE="${GHAS_CODE_ENGINE:-auto}"

exec /home/toxic/.bun/bin/bun run --cwd /home/toxic/github-advanced-search-mcp \
  apps/mcp/src/server.ts --mode stdio "$@"
