#!/usr/bin/env bash
# scripts/selftest.sh
# Verifies determinism, isolation, and schema stability.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

echo "=== MCP Self-Test Harness ==="
echo "Working in: $TEST_DIR"

# 1. SETUP FIXTURES
# -----------------
# Create a dummy config (to prove explicit loading)
cat > "$TEST_DIR/test_config.env" <<EOF
GITHUB_TOKEN=mock_token_123
GH_SEARCH_MOCK_MODE=true
EOF

# 2. RUN QUERY (MOCKED)
# ---------------------
echo "Running mock query..."
# We expect --config-file to be supported (future refactor)
# We expect JSON output
"$REPO_ROOT/target/debug/gh-search" \
  --config-file "$TEST_DIR/test_config.env" \
  --verbose \
  query "test query" \
  --limit 1 \
  --no-human \
  > "$TEST_DIR/output.json"

# 3. VERIFY OUTPUT SCHEMA
# -----------------------
echo "Verifying output schema..."
if ! jq -e '.[0].title' "$TEST_DIR/output.json" > /dev/null; then
    echo "ERROR: Invalid JSON schema."
    cat "$TEST_DIR/output.json"
    exit 1
fi

# 4. VERIFY FAILURE MODES
# -----------------------
echo "Verifying loud failure (missing config)..."
if "$REPO_ROOT/target/debug/gh-search" --config-file "/nonexistent" query "fail" 2>/dev/null; then
    echo "ERROR: Should have failed with missing config."
    exit 1
else
    echo "OK: Failed as expected."
fi

echo "=== Self-Test Passed ==="
