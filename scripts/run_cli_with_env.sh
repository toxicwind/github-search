#!/usr/bin/env bash
# run_cli_with_env.sh — ensure gh-search sees ~/.env (GITHUB_TOKEN, etc.)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="${ROOT}/target/release/gh-search"

if [[ ! -x "$BIN" ]]; then
  echo "gh-search binary not built at ${BIN}; run ./dev.sh rust first." >&2
  exit 1
fi

if [[ -f "${HOME}/.env" ]]; then
  # shellcheck disable=SC1090
  source "${HOME}/.env"
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN not set (expected in ~/.env); refusing to run gh-search." >&2
  exit 1
fi

exec "$BIN" "$@"
