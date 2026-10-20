# Pattern Mining – Ranking & Tokenization (Dec 28, 2025)

Twelve repos inspected via GitHub APIs for ranking/tokenization techniques and how we folded ideas into `github-advanced-search-mcp`. Each permalink uses the HEAD SHA on 2025-12-28.

1) **BurntSushi/ripgrep** – `crates/searcher/src/searcher/core.rs` @ `0a88cccd5188074de96f54a4b6b44a63971ac157`  
   - Technique: binary detection plus `FastMatchResult` fast/slow switching to skip useless bytes and avoid noisy matches.  
   - Merge: inspired our snippet collector to stay lightweight and fed identifier/BM25 paths only after cheap tokenization.

2) **sourcegraph/zoekt** – `index/score.go` @ `886b229dcd5e7bec0c9918002b77345d27c84e3c`  
   - Technique: per-line scoring combines candidate matches with language detection (go-enry) and symbol extraction.  
   - Merge: we added language-affinity bonus keyed off detected query language and kept per-snippet BM25 scoring.

3) **OpenGrok/OpenGrok** – `opengrok-indexer/src/main/java/org/opengrok/indexer/search/QueryBuilder.java` @ `5c3018cc025f7a40e4edbaca9aeaa5b670db32cc`  
   - Technique: multi-field Boolean Lucene queries (defs/refs/path/hist/type) with scoped boosts.  
   - Merge: reinforced our score_breakdown slots for context/path bonuses and popularity/rareness separation.

4) **tantivy-search/tantivy** – `src/query/bm25.rs` @ `ce97beb86f9f1f49f63c387e644c2f21d97405a8`  
   - Technique: canonical BM25 with field norms and cached tf components.  
   - Merge: parameterized BM25 in `ranking.rs` (k1=1.6, b=0.75) and clamped contributions.

5) **meilisearch/meilisearch** – `crates/milli/src/criterion.rs` @ `f4225164faf78f15a4265ce04698f6ba23288d8a`  
   - Technique: ordered ranking rules (words, typo, proximity, attribute, sort, exactness).  
   - Merge: mirrored as ordered weights in `RankWeights` and kept score banding to avoid runaway sums.

6) **olivernn/lunr.js** – `lib/lunr.js` @ `aa5a878f62a6bba1e8e5b95714899e17e8150b38`  
   - Technique: pipeline of trimmer → stopword filter → stemmer with a search-time stemmer stage.  
   - Merge: informed our CamelCase/snake_case splitting pipeline and stop-word–like query token filter (`tokenize_with_idents`).

7) **blevesearch/bleve** – `search/scorer/scorer_term.go` @ `9808f42dbd7650748b513e62e22d6a3a61a45a4a`  
   - Technique: term scorer caches idf/queryWeight, tracks avg doc length to emulate BM25.  
   - Merge: reused doc-length normalization and idf caching in our BM25 snippet scorer.

8) **livegrep/livegrep** – `src/codesearch.cc` @ `84f1eb0de5bd0396b18ce476d46f32b520d3e071`  
   - Technique: suffix-array index (divsufsort) with skip thresholds (`kMinSkip`, `kMinFilterRatio`) to prune scans.  
   - Merge: we gate heavy heuristics behind the experimental flag to keep a fast path for small result sets.

9) **apache/lucene** – `lucene/core/src/java/org/apache/lucene/search/similarities/BM25Similarity.java` @ `2ad2530ecd9178265149ba5555145f71080a2a92`  
   - Technique: reference BM25 implementation (idf + length normalization) with tunable k1/b.  
   - Merge: used as calibration source for our weight defaults and tuning bounds.

10) **elastic/elasticsearch** – `server/src/main/java/org/elasticsearch/index/similarity/SimilarityService.java` @ `c00976d4fd4d09bb0a83019ec870b91c3e061194`  
    - Technique: per-field similarity registry, defaults to BM25 while allowing scripted similarities.  
    - Merge: kept `RankWeights` persistent/override-able per run and exposed CLI flag to swap rankers.

11) **whoosh-community/whoosh** – `src/whoosh/scoring.py` @ `baa4d577fdb34bfcf30547c8c6bf853fffeb7fe0`  
    - Technique: pluggable weighting models with explicit idf and BM25F-style parameters.  
    - Merge: inspired the `WeightTuningPipeline` + `RankWeights::normalize` to keep weights comparable.

12) **tree-sitter/tree-sitter** – `lib/src/get_changed_ranges.c` @ `8e4f21aba0691f84df9fa23b20be1216b90ca802`  
    - Technique: incremental change detection to restrict re-parse surface area.  
    - Merge: informs future plan to cache snippet tokenization and only recompute BM25/identifier scores for changed docs.
