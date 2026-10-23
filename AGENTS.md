# AGENTS.md — github-advanced-search-mcp (estate-scripts Cutting Edge)

**GitHub:** [toxicwind/github-advanced-search-mcp](https://github.com/toxicwind/github-advanced-search-mcp)  
**Local:** `/home/toxic/github-advanced-search-mcp`  
**Grok MCP name:** `ghas` in `~/.grok/config.toml`

## MCP tools (use the narrow command)

| Tool | Use for |
|------|---------|
| `ghas_health` | Auth + tool list probe |
| `ghas_search_code` | Code search only |
| `ghas_search_repositories` | Repo search |
| `ghas_search_issues` | Issues index |
| `ghas_search_pull_requests` | PRs |
| `ghas_search_users` / `commits` / `discussions` / `packages` | Same-named surfaces |
| `ghas_search_unified` | Smart multi-category (when unsure) |
| `ghas_query_issues` | Issues API (`is:open repo:owner/name`) |
| `ghas_list_repo_issues` | Issues in one repo |
| `ghas_get_repository` | One repo metadata |
| `ghas_get_file_contents` | Read a file |
| `ghas_compare_search` | Optimized vs raw ranking |
| `ghas_simple_search` | ≤5 results for small LLMs |
| `ghas_rank_debug` | Code search + scores + engine flags |
| `ghas_engine_info` | Blackbird session / experimental rank |

Legacy aliases (`github_search`, `github_list_issues`, …) still work. Refresh Cursor descriptors: `./scripts/sync-grok-mcp-descriptors.sh`

This repo is maintained as part of the toxicwind estate-scripts stack (May 2026 max level).

## Core Philosophy
- We own everything. No workarounds — only proper, cutting-edge fixes.
- Full git history is always available for archaeology (no shallow clones for serious work).
- Browser control = real logged-in user sessions via estate-scripts Firefox profile takeover (not throwaway instances).

## estate-scripts Firefox Live Control (the correct way)
We have first-class support for driving a real, persistent, logged-in Firefox exactly like the Chromium CDP workflow.

### One-time setup (already done in this tree)
```bash
cd /home/toxic/github-advanced-search-mcp
./scripts/estate-scripts-browser/launch-firefox-from-profile.sh
```

This launches (or takes over) your daily Firefox profile under Playwright remote control and prints a `ws://` endpoint.

### Using it
```bash
# In another terminal / your MCP config
PLAYWRIGHT_MCP_BROWSER=firefox \
PLAYWRIGHT_MCP_REMOTE_ENDPOINT=ws://... \
  node /home/toxic/estate-maximal/mcp-forks/playwright-mcp/estate-scripts-launch.js
```

Or via the ghas dev flow:
```bash
GHAS_BROWSER=firefox bun run dev:headed
```

All normal `browser_*` tools (click, evaluate, snapshots, etc.) now work against your real GitHub-logged-in tabs, advanced search, etc.

The scripts live in `scripts/estate-scripts-browser/` and are also symlinked/copied from the main estate-scripts playwright-mcp fork for consistency.

## Exploring History / Finding Previous LLM Weirdness
This repo has been through many aggressive agent cycles. To investigate "what the previous LLM did":

```bash
# The big one
git show bddf448 --stat          # Archive Rust + add headed dev flow

# Suspicious LLM artifacts
git log --all --oneline | grep -E '^\w+ \.$'

# Full history of the browser control surface
git log --all --follow -p -- scripts/dev-headed-starter.mjs | less

# Search history for anything browser/headed/playwright related
git log --all -S browser --oneline -i
git log --all -S headed --oneline -i
```

Never use shallow clones when doing this kind of archaeology.

## Secrets Management (proper, not scattered .env backups)
We are moving away from dozens of random .env / secrets.env files and their backups in graveyards and config_backup_* dirs.

**Correct pattern (cutting edge):**
- Central store: `~/.config/estate-scripts/secrets.env` (or sops + age / Infisical)
- All projects source from it or use symlinks.
- The genesis `secrets.env.example` (in graveyard) shows the old scattered pattern.

When you find old .env backups containing `GITHUB` + `HUGGING` (or `API_KEY_GITHUB` + `API_KEY_HUGGINGFACE`), treat them as archaeology and migrate the values into the central store.

## Running the Stack
See the main README and `just` targets (including the Firefox ones we added).

This AGENTS.md exists so future agents (and you) don't have to rediscover the estate-scripts Firefox integration or repeat the history archaeology process.

## Secrets (Master Grok Agent)

All secrets for the entire estate-scripts stack live in the master Grok build:

`~/.secrets`

This is the single source of truth.

Load it in your shell:
```bash
echo 'source ~/.secrets' >> ~/.zshrc
```

## Autonomous Loop Control (Cycle 1, scheduler 019e8e679e12)
Grok estate-scripts autonomous-iteration loop (durable 5m) is actively controlling ghas: health verified, explicit searches for estate-scripts/openfang/plan/iteration, "we control ghas" asserted, bridge issues noted for maximization via profile. 
- Agents coordinated (orchestrator-max activated from Crashed, messages sent to max hands for iteration help using ghas + git sync).
- Git sync live: previous auto-iter-0 commit pushed; this AGENTS updated for cycle.
- Plan and estate-scripts docs kept in sync.
High attention: full ghas + openfang audits every cycle. Durable resume supported.
See ~/.grok/skills/autonomous-iteration/ and session plan.md for details.

The Grok agent, ralph, ghas-mcp, estate-scripts playwright fork, openfang agents, etc. are expected to source `~/.secrets` on startup (either directly or via MCP wrappers like `ghas-mcp-stdio.sh` / `mcp-source-secrets.sh`).

Do **not** create additional scattered `.env` or `secrets.env` files in project roots or graveyards. Everything funnels through the master agent secrets.


## Ranking (Bun, 2026-07)

- Default: experimental RELEVANCE-FIRST weights in `packages/github-client/src/ranking/`
- Disable: `GHAS_EXPERIMENTAL_RANK=0`
- Golden: `bun run scripts/compare-to-ui.mjs` (vs Blackbird UI index)
- Archaeology: `_archaeology/` epochs 01–07 (frozen snapshots)
- Runtime is **Bun only**; Rust under `legacy/rust` + archaeology (Cargo workspace members empty)


---

## 🔧 Hard Rules (universal)

1. **Verify live, then claim.** No "done" without `curl` / `lsof` / `nvidia-smi` / `npx tsgo --noEmit`.
2. **Fail loud.** Never `2>/dev/null`, never `|| true`. Errors are diagnostic.
3. **No commit without explicit user request.** Fork stays private under `toxicwind`.
4. **Multi-strategy.** Non-trivial work → 3+ approaches, benchmark, keep runner-up.
5. **TDD/BDD.** Failing assertion first, then fix. `npx tsgo --noEmit` for type-check.
6. **Use emergence tools first.** GHAS (`:25113`) → ast-grep (`ast-grep` binary) → Tombi for TOML.
7. **call_tool_destructive is DEFAULT for state changes.** Write/edit/modify = destructive. Read-only = inspection only.
8. **No `/dev/null`, no banner `echo`.** Both waste tokens.
8b. **BANNED/SLOW TOOLS — do NOT use, ever:** `find`, `head`, `tail`, `/dev/null`, and system-wide `lsof`.
    - `find` over a large/full disk is slow + wasteful -> use `fd` (fast, gitignore-aware)
      or scope `du`/`fd` to a SPECIFIC directory, never the whole `/home`/`/`.
    - `head`/`tail` truncation -> read full files with the `read` tool (1M context).
    - `/dev/null` -> fail loud; never silence errors.
    - `lsof` (esp. system-wide) is INSANELY SLOW -> use INSTANT `/proc/<pid>/fd` symlink
      reads (`readlink /proc/$PID/fd/*`) to see what a process has open. Scope to known PIDs.
9. **Fix bashrc nested quote issue.** The `pi-check` alias had nested double quotes inside single quotes, causing `unexpected EOF while looking for matching '"'` errors. Use functions instead of aliases for complex commands.
9. **CUDA-aware.** RTX 3090 — validate with `nvidia-smi`. Never assume upstream defaults.
10. **Stop stacking long commands.** Sub-second probes. Reserve `60|120` for intentional jobs.
11. **No `head` truncation.** You have 1M context. Read full files. No `| head -20`.
12. **Timeout/failfast/high-frequency is FIRST-CLASS everywhere** (retry, provider-retry, worker-limits, MCP calls, scripts). NO insane monolithic timeouts — use failfast + high-frequency liveness probes + per-attempt deadlines.
13. **Dynamic `${ENV_VAR}` interpolation is first-class** in configs/scripts (settings.json, config.yaml, mcpproxy config, launch scripts). Prefer `${...}` over hardcoded values.
14. **Lint + test after EVERY code change; coverage floor 82%.** Pre-existing type errors in unrelated test files do NOT block the change under review — isolate + report.
15. **BACKGROUNDING IS FIRST-CLASS.** Any op that can run long (downloads, builds, scans,
   npm/pip/apt, model fetches) MUST be launched in background (`cmd &`, capture `$!`), tracked
   by PID, and CANCELLED if it overruns a per-attempt deadline (`timeout`, `kill` on a watchdog
   loop). Never block on a monolithic synchronous command. Keep a live PID ledger.
16. **GOAL = ENDLESS TODO.** TODO.md is a CONTINUOUS improvement loop, not a finite list.
   Re-audit constantly; new findings always append; done items cycle back as deeper waves.
   No "finished" — only "next wave". Mutate TODO after every meaningful step.

---

## 🛠️ Tool Reference

### ✅ INSTALLED (use these)

| Tool | Binary | Purpose |
|---|---|---|
| `fd` | `/usr/bin/fd` | Fast find (respects .gitignore) |
| `rg` | `/usr/bin/rg` | Fast grep (respects .gitignore) |
| `ast-grep` | `~/.local/share/mise/shims/ast-grep` | AST structural search/rewrite |
| `eza` | `/usr/bin/eza` | Modern ls (git-aware) |
| `mise` | `~/.local/bin/mise` | Runtime manager |
| `bun` | mise shim | Fast JS runtime |
| `node` | mise shim | JS runtime |
| `cargo` | mise shim | Rust build |
| `jq` | mise shim | JSON processing |

### ❌ NOT INSTALLED (don't use, install first if needed)

| Tool | Install Command | Purpose |
|---|---|---|
| `tombi` | `mise use -g tombi` | TOML toolkit |
| `tsgo` | `npx tsgo` | TypeScript type-check (use via npx) |
| `vitest` | `npx vitest` | Test runner (use via npx) |

### 🚫 NEVER USE (removed/confusing)

| Name | Why |
|---|---|
| `sg` | That's SGLang, NOT ast-grep. Removed shim. Use `ast-grep`. |

---

## 📝 AST-Grep Patterns

### Rule YAML
```yaml
id: my-rule
language: typescript
rule:
  pattern: 'console.log($MSG)'
fix: 'logger.info($MSG)'
```

### Commands
```bash
ast-grep scan -p 'pattern' -l ts src/
ast-grep scan -p 'pattern' --rewrite 'replacement' src/
ast-grep scan -p 'pattern' --json=stream src/
ast-grep scan -p 'pattern' --interactive src/
ast-grep scan --rule rule.yaml src/
```

---

## 📡 Live-verify commands

```bash
for p in 25100 25109 25112 25115; do
  fuser -s $p/tcp 2>/dev/null && echo "✅ :$p" || echo "❌ :$p DOWN"
done

curl -s http://127.0.0.1:25100/v1/models | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']),'models')"

cd /home/toxic/projects/pi-agent/packages/ai && npx tsgo --noEmit

ast-grep scan -p 'NVIDIA_MODELS' -l ts --json=stream /home/toxic/projects/pi-agent/packages/ai/src/
```

---

## ⏱️ Timeout / Failfast / Dynamic / Env-Var (first-class, 2026-08-13)

- **Failfast + high-frequency**: every retry/timeout path uses per-attempt deadlines, failfast
  on fatal errors, and high-frequency liveness probes. No `timeout 420` monoliths.
- **Dynamic `${ENV_VAR}`**: configs and launch scripts interpolate env vars (`${NVIDIA_API_KEY}`,
  `${HOME}`, etc.). Hardcoded secrets/paths are an anti-pattern — interpolate.
- **Coverage floor 82%**: `npx vitest run --coverage --bail` after code. Lint (`biome`) + typecheck.
- See TODO Wave 5 for the worker-limit `/32` redo + timeout/failfast threading.

## 🔌 MCP / mcpproxy (estate-scripts-owned)

- **mcpproxy** is the single MCP federation gateway: `http://127.0.0.1:25109/mcp`, owned by
estate-scripts (`pitchfork start mcpproxy` / `mise run restart-mcpproxy` -> `mcpproxy serve
--config=/home/toxic/.mcpproxy/mcp_config.json`). 43 real upstreams (ghas + 42 others).
- **pi MUST list ONLY `mcpproxy`** in `~/.pi/agent/mcp.json` (no duplicate direct `ghas`/
  `nvidia-nim` entries). All MCP tools reach pi through the proxy via `retrieve_tools`.
- **nvidia-nim is NOT an MCP server.** It is a herd/estate-scripts-router **completions API**
  (OpenAI-compatible, on `:25100`). NVIDIA models are first-class via pi-agent's `nvidia`
  provider (`packages/ai/src/providers/`) -> estate-scripts-router/herd, not an MCP upstream.
- **Subagents**: `config.yaml` `can_spawn_subagents:true` + whitelist + `subagents.defaultModel:
  opencode/hy3-free`. The `subagent` spawn tool is a LIVE-PI builtin (not callable from a
  plain assistant context) — fanout only works inside an interactive pi session.

## 🔌 Port SSOT

`/home/toxic/estate/config/ports.env` — all 25xxx, never invent.

---

<!-- delendai:begin -->

# delendai host hints (auto-generated)

See `docs/delendai/host-hints/agent-instructions.generated.md` for the live agent catalog.

- Bootstrap §7 (repo-level rules) is in effect.

<!-- delendai:end -->
