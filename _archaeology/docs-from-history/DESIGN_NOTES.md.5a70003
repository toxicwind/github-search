# Design Notes & Source Ledger

## CLI & UX

- Status messaging + concurrent categories mirror the `cachix/devenv` CLI where searches run in parallel while telling the user which scope is active.
- Command palette + keyboard hint (`⌘/Ctrl + K`) borrow from `keenthemes/reui` and `JuanQuenga/paymore-lite` cmdk demos.

## HTTP / OpenAI façade

- The Axum router structure (typed request/response structs, default parameters) is lifted from `jgowdy-godaddy/GoGrid`'s OpenAI-compatible API module.
- Query parsing pattern (typed `Query<T>` extractor) comes from `penumbra-zone/standard-penumbra-explorer`.

## Ranking & scoring

- Score breakdown structure + logger-friendly components are inspired by `meilisearch/meilisearch` ranking rules.
- Stars/recency weighting reuses the "popularity vs freshness" heuristic described in GitHub's public search docs and refined after reading `meilisearch`'s weighting code.
- Reciprocal Rank Fusion when merging code + repo categories follows the hybrid search notes from `BeaconBay/ck` and `pgvector/pgvector-rust`'s hybrid example.

| Component | Source | Notes |
| --- | --- | --- |
| `base` | GitHub API score | direct API signal |
| `stars` | `ln(1+stars)` | rewards popularity without letting mega repos dominate |
| `recency` | last push date → freshness bonus | only relevant if timestamp present |
| `text_match` | highlight count from code search | snippet-heavy matches float higher |
| `fusion` | RRF(60, rank) | ensures repo + code streams blend deterministically |

## SPA

- Layout + grouped results mimic `keenthemes/reui` command palette docs.
- Loading indicator + search state toggles were inspired by the `valitydev/control-center` cmdk service.

## Docs & DX

- README usage tables follow the `iExecBlockchainComputing/iexec-sdk` CLI docs pattern.
- Architecture overview sections take cues from `AgentOps-AI/agentops` SDK notes (principles + component diagram).

## Recursive hb-github-finder loop

Each cycle logs:

1. `Research-Before` queries (≥2) with adopted ideas.
2. `Applied-From` ledger.
3. `Research-After` validation queries.
4. Source rotation so no repo dominates consecutive cycles.

Keep appending to this file as you evolve scoring, UX, or DX surfaces, and cite the repos/notes that informed the change.
