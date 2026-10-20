# Changelog

## 2025-12-28 – Ranking v2: BM25 + Popularity + Identifier Split
- Added experimental heuristic ranker (BM25, identifier splitting, language affinity, popularity, commit recency) gated by `--experimental-ranking` / `?ranker=experimental`.
- Introduced `RankWeights` persistence and lightweight gradient tuner fed by `rank_samples.json`.
- Expanded `ScoreBreakdown` and ML features to keep scores explainable and bounded (0–100).
- Added unit tests for BM25 lift, identifier splits, and score clamping; cleaned unused imports.
- Updated README with scoring matrix; no breaking API changes expected.
