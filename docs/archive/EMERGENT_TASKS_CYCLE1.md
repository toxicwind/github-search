# Emergent Tasks: Cycle 1 (GH-Search Quality & Polish)

## Analysis of Current State

- ✅ CLI has JSON output (default) and --human flag
- ✅ Structured logging with tracing
- ✅ Configuration via environment variables
- ✅ Base64 API updated to 0.22
- ⚠️ Still 1 compiler warning (unused `categories` field)
- ⚠️ No rate limiting for GitHub API calls
- ⚠️ Missing integration tests

## Cycle 1: Foundation Hardening (6 Tasks + Meta)

### Phase 1: Code Quality

**Task 1: Fix Remaining Compiler Warnings**
- Address unused `categories` field in SearchParams
- Run `cargo clippy --all-targets` and fix warnings
- Verify clean build

**Task 2: Add GitHub API Rate Limiting**
- Add `governor` crate for rate limiting
- Implement token bucket (5000 requests/hour for authenticated)
- Add rate limit headers to responses
- Handle 403 rate limit errors gracefully

### Phase 2: Testing

**Task 3: Add Integration Tests**
- Create `tests/integration/` directory
- Test CLI query with real GitHub API (rate limited)
- Test --smart flag with connected files
- Test --human vs JSON output modes

**Task 4: Add Benchmark Suite**
- Create `benches/` directory using criterion
- Benchmark search performance
- Benchmark smart analysis performance
- Document baseline metrics

### Phase 3: Documentation

**Task 5: Create User Guide**
- Document all CLI flags with examples
- Add configuration environment variables table
- Show JSON output schema
- Add troubleshooting section

**Task 6: Add CONTRIBUTING.md**
- Document development setup
- Explain test strategy
- Code style guidelines
- PR process

### Phase 4: Meta-Task

**Task 7: Generate Cycle 2 Tasks**
- Analyze completed improvements
- Use `hb research` to find next patterns
- Create `EMERGENT_TASKS_CYCLE2.md`
- **WAIT FOR "Proceed?" APPROVAL**

---

**Status**: Active Cycle - Execute Tasks 1-7 autonomously, halt at Task 7 for user approval.
