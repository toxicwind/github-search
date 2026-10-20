# Implementation Plan: Aggressive Escalation

## Phase 1: The Portal (Immediate)
- [ ] **Mutate ResultCard**: Add "Portal Mode" state.
- [ ] **Create SearchPortal**: A component that overlays/expands the result.
    - [ ] Fetch Repo File Tree (mock or real).
    - [ ] Fetch README content.
    - [ ] "God-Eye" layout (Tree left, Preview right).
- [ ] **Integrate**: Clicking a result triggers Portal instead of navigation.

## Phase 2: Active Verification (The Swarm)
- [ ] **Agentic Hook**: `useRepoHealth`.
    - [ ] On Portal open, trigger a background check.
    - [ ] Check: Is it maintained? Does it have tests?
    - [ ] Display "Vital Signs" (Heartbeat, Shield, Toxic).

## Phase 3: The Mutator
- [ ] **Actionable Search**: Add "Refactor" buttons to search results.
- [ ] **Multi-Select**: "Select all 10 repos and find common dependencies".

## Technical Debt (Intentional)
- We will prioritize *power* over *clean code*.
- Components may become large "God Components". This is acceptable if it enables "God Mode" UX.
- Performance will be sacrificed for feature density (initially).
