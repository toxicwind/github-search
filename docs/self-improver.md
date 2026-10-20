# Self-Improver Seed

hb-gh-search ships with a minimal self-improvement scaffold designed for autonomous agents.

## Metrics

- Metric snapshots live under `target/hb-gh-search-metrics/<variant-id>.json`.
- Each snapshot (`MetricsSnapshot`) contains a list of `MetricSample` entries with:
  - `benchmark`: scenario identifier (e.g. `repo_search_hot`).
  - `query_shape`: short label describing query filters.
  - `latency_ms`: average end-to-end latency.
  - `result_count`: how many results were returned.
  - `quality_score`: scalar (0-1) representing relevance or human spot-check outcome.
- Snapshots serialize to JSON via `hb_gh_search_core::self_improver::MetricsSnapshot`.

## Variants & Novelty

- A variant is represented by `VariantRecord`:
  - `id`, optional `parent_id`, UTC timestamp, and short `summary`.
  - `metrics_path`: optional pointer to the snapshot file.
  - `novelty`: `NoveltyDescriptor` (active scoring features, HTTP surface area, UX capabilities).
- Novelty distance is computed via symmetric difference of feature lists plus API surface deltas.
  - Values > 0.5 are considered meaningfully distinct.

## Lineage Log

- Stored as JSON Lines at `target/hb-gh-search-lineage.jsonl`.
- Append new variants with `SelfImprover::append_variant`.
- `SelfImprover::summarize()` aggregates lineage into a concise view for CLI/dev tooling.

## Workflow for future agents

1. **Inspect state**
   - Run `hb-gh-search dev self-improver --json` (omit `--json` for human-readable text) to read lineage + metrics summaries.
   - Use the reported under-explored dimensions and stagnation signal to decide which scoring features, HTTP APIs, or UX modes deserve attention.
2. **Propose change**
   - Make targeted modifications (e.g. new ranking feature, caching layer).
   - Update novelty descriptor to include new capabilities.
3. **Benchmark**
   - Execute the benchmark scripts (see README) and write a `MetricsSnapshot` JSON file.
4. **Decide**
   - Use `SelfImprover::decide_acceptance` comparing baseline vs candidate metrics + novelty distance.
   - Accept the variant only if metrics improve or unlock cumulative novelty.
5. **Record**
   - Append a `VariantRecord` with summary + metrics path to the lineage log.
   - Re-run `hb-gh-search dev self-improver --json` to expose the new frontier to future runs.

Runs must remain open-ended: stop or pivot only when metrics plateau across multiple variants, novelty distance stays low, or external budgets/time windows expire.
