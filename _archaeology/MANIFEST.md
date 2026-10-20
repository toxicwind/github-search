# GHAS Archaeology MANIFEST

| Folder | Commit | Purpose | Convert priority |
|--------|--------|---------|------------------|
| 01-pre-bun-rust | 97621e6 (=bddf448^) | Full crates before archive | Reference |
| 02-relevance-first | 5a70003 | RankWeights experimental (text_match=3.5, popularity=0.4) | **W1** |
| 03-emergent-cycle003 | 8da6fbe | Fracture/GhostLog/donors | W5–W6 later |
| 04-bun-replatform | 97621e6 | Baseline Bun apps/packages | Diff only |
| 05-archive-layout | bddf448 | Intended legacy/ freeze | Restore SSOT |
| 06-blackbird-fetch | d705685 | Dual-engine fetch | W0 (live) |

Rules: frozen snapshots — never imported by package.json workspaces.
