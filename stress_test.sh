#!/bin/bash
set -e

echo "Building release binary..."
cargo build --release -p gh-search --quiet
BINARY="./target/release/gh-search"

if [ ! -f "$BINARY" ]; then
    echo "Error: Binary not found at $BINARY"
    exit 1
fi

echo "Binary built successfully at $BINARY"

# Array of 10 distinct queries to stress test
queries=(
    "Antigravity library"
    "rust async executor"
    "monitor log files"
    "react hooks useMemo"
    "python data science"
    "kubernetes operator pattern"
    "docker compose networking"
    "linux kernel modules"
    "machine learning ranking"
    "mcp protocol specification"
)

pids=()
temp_dirs=()

echo "Starting 10 concurrent searches with ISOLATED data directories..."

for i in "${!queries[@]}"; do
    query="${queries[$i]}"
    # Create unique data directory for this process to avoid RocksDB/Cache lock contention
    data_dir=$(mktemp -d -t gh-search-stress-$i-XXXXXX)
    temp_dirs+=("$data_dir")
    
    echo "[$i] Launching search for: '$query' (Data Dir: $data_dir)"
    
    # Run binary with unique data dir env var
    # Redirecting output to individual logs
    GH_SEARCH_DATA_DIR="$data_dir" "$BINARY" query "$query" --limit 2 --no-human > "search_stress_${i}.log" 2>&1 &
    pids+=($!)
done

echo "All searches launched. Waiting for completion..."

failed=0
for pid in "${pids[@]}"; do
    if wait $pid; then
        echo "Process $pid finished successfully."
    else
        echo "Process $pid FAILED."
        failed=$((failed + 1))
    fi
done

# Cleanup
echo "Cleaning up temporary directories..."
for dir in "${temp_dirs[@]}"; do
    rm -rf "$dir"
done

if [ $failed -eq 0 ]; then
    echo "SUCCESS: All 10 searches completed successfully."
else
    echo "FAILURE: $failed searches failed. Check search_stress_*.log for details."
    grep -i "timeout" search_stress_*.log || true
    grep -i "error" search_stress_*.log || true
    exit 1
fi
