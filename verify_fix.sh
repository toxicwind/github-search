#!/usr/bin/env bash
set -e

# Load environment
source .env

echo "=== Verifying Complex Query after Fix ==="
echo "Query: \"asyncio supervisor\" restart crash lock"

# Limit to 10 results to see if we get more than 4
RUST_LOG=info ./target/debug/gh-search query '"asyncio supervisor" restart crash lock' --smart --limit 10
