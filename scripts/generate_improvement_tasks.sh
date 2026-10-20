#!/usr/bin/env bash
# Recursive Improvement Task Generator
# Generates 6 new improvement tasks based on codebase analysis

set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
OUTPUT_FILE="${OUTPUT_FILE:-$PROJECT_ROOT/next_improvements.md}"

echo "🔍 Analyzing codebase for improvement opportunities..."

# Collect improvement candidates
TODOS=$(grep -rn "TODO\|FIXME\|XXX\|HACK" "$PROJECT_ROOT/crates" 2>/dev/null | head -20 || true)
UNWRAPS=$(grep -rn "\.unwrap()\|\.expect(" "$PROJECT_ROOT/crates" 2>/dev/null | wc -l)
CLIPPY_OUTPUT=$(cd "$PROJECT_ROOT" && cargo clippy --all-targets 2>&1 | grep "warning:" | head -10 || true)

# Generate task document
cat > "$OUTPUT_FILE" << 'EOF'
# Next Improvement Iteration

Generated: $(date -Iseconds)

## Task 1: Address Remaining TODO/FIXME Comments
**Priority**: Medium
**Complexity**: Varies

**Found Items**:
```
${TODOS}
```

**Solution**: Review and resolve or document each TODO/FIXME with a tracking issue.

---

## Task 2: Reduce unwrap() Usage
**Priority**: High  
**Complexity**: 5/10

**Current Count**: ${UNWRAPS} instances

**Solution**: Replace with proper error propagation using `?` or `Result` types.

---

## Task 3: Address Clippy Warnings
**Priority**: Medium
**Complexity**: 3/10

**Current Warnings**:
```
${CLIPPY_OUTPUT}
```

**Solution**: Fix all clippy warnings to improve code quality.

---

## Task 4: Add Integration Tests
**Priority**: High
**Complexity**: 6/10

**Problem**: Limited test coverage for end-to-end workflows

**Solution**: Add integration tests for:
- CLI query with --smart flag
- WebSocket search flow
- Cache hit/miss scenarios

---

## Task 5: Performance Profiling
**Priority**: Low
**Complexity**: 7/10

**Problem**: No baseline performance metrics

**Solution**: 
- Add criterion benchmarks for hot paths
- Profile smart fetch with flamegraph
- Optimize based on findings

---

## Task 6: Documentation Improvements
**Priority**: Medium
**Complexity**: 4/10

**Problem**: Missing inline documentation for public APIs

**Solution**:
- Add rustdoc comments to all public functions
- Create examples/ directory with usage samples
- Update README with configuration options

---

EOF

echo "✅ Generated $OUTPUT_FILE"
echo ""
echo "📋 Next steps:"
echo "1. Review the generated tasks"
echo "2. Reply 'Proceed' to start implementation"
echo "3. Or set AUTO_APPROVE_IMPROVEMENTS=1 to skip approval"
