#!/usr/bin/env bash
set -e

# Load environment
source .env

BINARY="./target/debug/gh-search"

echo "=== Running 5 Complex Searches ==="

echo -e "\n1. Rust Async Streams (Regex + Language)"
$BINARY query "language:rust /async fn.*stream/" --limit 2

echo -e "\n2. Python ML Requirements (File targeting)"
$BINARY query "language:python \"torch.nn\" filename:requirements.txt" --limit 2

echo -e "\n3. React Hooks (Exclusion)"
$BINARY query "language:typescript \"useEffect\" -filename:*.test.ts" --limit 2

echo -e "\n4. Go Concurrency (Keywords)"
$BINARY query "language:go \"go func\" channel" --limit 2

echo -e "\n5. Dockerfiles with Multi-stage builds"
$BINARY query "filename:Dockerfile \"FROM .* AS\"" --limit 2
