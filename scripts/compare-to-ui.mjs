#!/usr/bin/env bun
/**
 * Golden compare: GHAS ranked code search vs Blackbird (UI index).
 * Exit 1 if overlap@10 < threshold for main query.
 */
import {
  searchBlackbirdCode,
  refreshGithubWebSession,
  hasBlackbirdSession,
} from "../packages/github-client/src/blackbird.ts";
import { searchGithubDetailed } from "../packages/github-client/src/index.ts";

function key(repo, path) {
  return `${repo}:${(path || "").split("?")[0].split("#")[0]}`;
}

async function topGhas(query, per = 10) {
  const g = await searchGithubDetailed({
    query,
    categories: ["code"],
    per_page: per,
    strict: true,
  });
  return (g.results || []).map((r) => key(r.repository, r.path));
}

async function topBb(query, per = 10) {
  const bb = await searchBlackbirdCode(query, per, 1);
  if (!bb.logged_in) return { logged_in: false, keys: [] };
  const keys = (bb.results || []).map((r) =>
    key(
      r.repo_nwo || r.repository?.full_name || "",
      r.path || r.blob_path || r.file_path || "",
    ),
  );
  // unique preserve order
  const seen = new Set();
  const uniq = [];
  for (const k of keys) {
    if (seen.has(k) || k === ":") continue;
    seen.add(k);
    uniq.push(k);
  }
  return { logged_in: true, keys: uniq.slice(0, per) };
}

function overlap(a, b) {
  const set = new Set(b);
  let hit = 0;
  for (const x of a) if (set.has(x)) hit++;
  return { hit, n: a.length, ratio: a.length ? hit / a.length : 0 };
}

const queries = [
  { q: "ast-grep ripgrep", minOverlap: 0.5 },
  { q: "filename:.zshrc", minOverlap: 0, basename: true },
];

await refreshGithubWebSession();
const report = [];
let failed = 0;

for (const { q, minOverlap, basename } of queries) {
  const ghas = await topGhas(q, 10);
  const bb = await topBb(q, 10);
  const ov = bb.logged_in ? overlap(ghas, bb.keys) : { hit: 0, n: ghas.length, ratio: null };
  let ok = true;
  let notes = [];
  if (basename) {
    const pure = ghas.filter((k) => {
      const path = k.split(":").slice(1).join(":");
      const base = path.split("/").pop() || "";
      return base === ".zshrc" || base.endsWith("/.zshrc");
    });
    // Accept .zshrc exact basename; allow .zshrc.* for now but flag
    const exact = ghas.filter((k) => (k.split(":").pop() || "").replace(/^.*\//, "") === ".zshrc");
    notes.push(`exact_basename=${exact.length}/${ghas.length}`);
    if (exact.length < 3) {
      ok = false;
      notes.push("filename:.zshrc purity low");
    }
  } else if (ov.ratio != null && ov.ratio < minOverlap) {
    ok = false;
    notes.push(`overlap ${ov.ratio.toFixed(2)} < ${minOverlap}`);
  }
  if (!ok) failed++;
  report.push({
    query: q,
    ok,
    blackbird_logged_in: bb.logged_in,
    overlap: ov,
    ghas_top5: ghas.slice(0, 5),
    bb_top5: bb.keys.slice(0, 5),
    notes,
  });
}

console.log(JSON.stringify({ failed, report }, null, 2));
process.exit(failed ? 1 : 0);
