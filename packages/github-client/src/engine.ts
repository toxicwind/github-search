/**
 * Bridge to crates/engine (ghas-engine) — the relevance-first ML ranker.
 * Designed to be spawned by Bun MCP; previously never wired (comment-only).
 *
 * Protocol: one JSON line request → one JSON line response on stdout.
 * stderr is diagnostics only.
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
// packages/github-client/src → repo root
const REPO_ROOT = resolve(HERE, "../../..");

export type EngineInputItem = {
  score?: number;
  name?: string;
  path?: string;
  html_url?: string;
  repository?: { full_name?: string; stargazers_count?: number };
  language?: string;
  stargazers_count?: number;
  updated_at?: string;
  description?: string;
  text_matches?: Array<{ fragment?: string }>;
};

export type EngineRankedItem = {
  name?: string;
  path?: string;
  html_url?: string;
  repository?: string;
  score: number;
  ml_score: number;
  text_match: number;
  star_score: number;
  recency_score: number;
  language?: string;
  evaluation: string;
  is_emergent: boolean;
};

function resolveEngineBin(): string | null {
  if (process.env.GHAS_ENGINE_BIN && existsSync(process.env.GHAS_ENGINE_BIN)) {
    return process.env.GHAS_ENGINE_BIN;
  }
  const candidates = [
    resolve(REPO_ROOT, "target/release/ghas-engine"),
    resolve(REPO_ROOT, "target/debug/ghas-engine"),
    resolve(HOME_BIN(), "ghas-engine"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function HOME_BIN() {
  return resolve(process.env.HOME ?? "/home/toxic", ".local/bin");
}

/**
 * Rank items with ghas-engine. Returns null if binary missing or call fails.
 * Timeout default 8s — engine is pure CPU on small lists.
 */
export async function rankWithGhasEngine(
  query: string,
  items: EngineInputItem[],
  timeoutMs = 8000,
): Promise<EngineRankedItem[] | null> {
  if (process.env.GHAS_ENGINE === "0" || process.env.GHAS_ENGINE === "off") {
    return null;
  }
  const bin = resolveEngineBin();
  if (!bin || !items.length) return null;

  const payload = JSON.stringify({
    method: "rank",
    query,
    items,
  });

  return new Promise((resolvePromise) => {
    const child = spawn(bin, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let settled = false;
    const finish = (value: EngineRankedItem[] | null) => {
      if (settled) return;
      settled = true;
      try {
        child.kill("SIGTERM");
      } catch {
        /* ignore */
      }
      resolvePromise(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      // one response line
      if (stdout.includes("\n")) {
        clearTimeout(timer);
        const line = stdout.split("\n").find((l) => l.trim().startsWith("{"));
        if (!line) {
          finish(null);
          return;
        }
        try {
          const resp = JSON.parse(line) as {
            ok?: boolean;
            results?: EngineRankedItem[];
          };
          if (resp.ok && Array.isArray(resp.results)) {
            finish(resp.results);
          } else {
            finish(null);
          }
        } catch {
          finish(null);
        }
      }
    });
    child.on("error", () => {
      clearTimeout(timer);
      finish(null);
    });
    child.on("close", () => {
      clearTimeout(timer);
      if (!settled) finish(null);
    });
    child.stdin.write(payload + "\n");
    child.stdin.end();
  });
}

export function engineAvailable(): boolean {
  return Boolean(resolveEngineBin());
}
