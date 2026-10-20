#!/bin/bash
# Cleanup script to merge duplicate GitHub search cache directories

set -e

echo "GitHub Search Cache Directory Cleanup"
echo "======================================"
echo

# Check if both directories exist
HYPHEN_DIR="$HOME/.gh-search-cache"
UNDERSCORE_DIR="$HOME/.gh_search_cache"

if [ ! -d "$HYPHEN_DIR" ] && [ ! -d "$UNDERSCORE_DIR" ]; then
    echo "✓ No cache directories found. Nothing to clean up."
    exit 0
fi

if [ ! -d "$UNDERSCORE_DIR" ]; then
    echo "✓ Only the correct directory (.gh-search-cache) exists. Nothing to clean up."
    exit 0
fi

echo "Found duplicate cache directories:"
echo "  - $HYPHEN_DIR"
echo "  - $UNDERSCORE_DIR"
echo

# Show sizes
if [ -d "$HYPHEN_DIR" ]; then
    HYPHEN_SIZE=$(du -sh "$HYPHEN_DIR" 2>/dev/null | cut -f1)
    echo "  .gh-search-cache size: $HYPHEN_SIZE"
fi

if [ -d "$UNDERSCORE_DIR" ]; then
    UNDERSCORE_SIZE=$(du -sh "$UNDERSCORE_DIR" 2>/dev/null | cut -f1)
    echo "  .gh_search_cache size: $UNDERSCORE_SIZE"
fi

echo

# If hyphen directory doesn't exist, just rename underscore to hyphen
if [ ! -d "$HYPHEN_DIR" ]; then
    echo "Moving .gh_search_cache → .gh-search-cache..."
    mv "$UNDERSCORE_DIR" "$HYPHEN_DIR"
    echo "✓ Done!"
    exit 0
fi

# Both exist - merge them
echo "Merging cache directories..."
echo "  Source: $UNDERSCORE_DIR"
echo "  Target: $HYPHEN_DIR"
echo

# Copy any unique files from underscore to hyphen directory
if [ -d "$UNDERSCORE_DIR" ]; then
    # Use rsync to merge, preserving newer files
    rsync -av --ignore-existing "$UNDERSCORE_DIR/" "$HYPHEN_DIR/"
    
    # Remove the underscore directory
    echo
    echo "Removing duplicate directory..."
    rm -rf "$UNDERSCORE_DIR"
fi

echo
echo "✓ Cleanup complete!"
echo "  Cache directory: $HYPHEN_DIR"
echo "  Size: $(du -sh "$HYPHEN_DIR" 2>/dev/null | cut -f1)"
