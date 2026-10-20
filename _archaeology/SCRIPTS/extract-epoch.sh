#!/usr/bin/env bash
set -euo pipefail
# Usage: extract-epoch.sh <name> <commit> [pathspec...]
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NAME="${1:?name}"; COMMIT="${2:?commit}"; shift 2
DEST="$ROOT/_archaeology/$NAME"
rm -rf "$DEST"
mkdir -p "$DEST"
if [[ $# -gt 0 ]]; then
  git -C "$ROOT" archive "$COMMIT" "$@" | tar -x -C "$DEST"
else
  git -C "$ROOT" archive "$COMMIT" | tar -x -C "$DEST"
fi
echo "$COMMIT" > "$DEST/EPOCH_COMMIT"
git -C "$ROOT" log -1 --format=fuller "$COMMIT" > "$DEST/EPOCH_META.txt"
echo "extracted $NAME @ $COMMIT -> $DEST"
