/**
 * GitHub Blackbird / web code search (the UI index).
 *
 * Classic REST `GET /search/code` is a *different* legacy engine:
 * - supports `filename:` but not path:** globs / new syntax
 * - results often diverge from github.com/search
 *
 * Blackbird is what powers github.com/search?type=code. It requires a
 * browser `user_session` cookie (PAT is not enough). Patterns inspired by
 * wzdnzd/harvester `search/client.py` (blackbird_count + session Cookie).
 *
 * Session sources (auto-refresh):
 * 1. GITHUB_SESSIONS / GITHUB_SESSION / GH_WEB_SESSION env (comma-separated OK)
 * 2. Firefox cookies.sqlite (profile paths + GHAS_FIREFOX_PROFILE)
 *
 * Cookie cache refreshes every GHAS_SESSION_REFRESH_MS (default 5m).
 */
import { existsSync, copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { Database } from "bun:sqlite";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

const HOME = process.env.HOME ?? "/home/toxic";
const WEB_ROOT = "https://github.com";
const REFRESH_MS = Number(process.env.GHAS_SESSION_REFRESH_MS ?? String(5 * 60 * 1000));
const COOKIE_NAMES = [
  "user_session",
  "__Host-user_session_same_site",
  "logged_in",
  "dotcom_user",
  "_octo",
  "_gh_sess",
];

export type BlackbirdHit = {
  path: string;
  repo_nwo: string;
  commit_sha?: string;
  ref_name?: string;
  blob_sha?: string;
  language_name?: string;
  snippets?: Array<{ lines?: string[]; jump_to_line_number?: number }>;
  match_count?: number;
};

export type BlackbirdSearchResult = {
  results: BlackbirdHit[];
  result_count: number;
  page_count: number | null;
  logged_in: boolean;
  engine: "blackbird";
  session_source: string;
};

type CookieCache = {
  cookie: string;
  user_session: string;
  source: string;
  fetchedAt: number;
};

let cookieCache: CookieCache | null = null;

function envSessions(): string[] {
  const raw =
    process.env.GITHUB_SESSIONS ||
    process.env.GITHUB_SESSION ||
    process.env.GH_WEB_SESSION ||
    process.env.GH_USER_SESSION ||
    "";
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !s.startsWith("your_"));
}

function firefoxProfileCandidates(): string[] {
  const out: string[] = [];
  const explicit = process.env.GHAS_FIREFOX_PROFILE;
  if (explicit) out.push(explicit);

  // Canonical estate-scripts / modern Firefox (profiles.ini lives under .config)
  const configFf = resolve(HOME, ".config/mozilla/firefox");
  const classicFf = resolve(HOME, ".mozilla/firefox");
  for (const base of [configFf, classicFf]) {
    const ini = resolve(base, "profiles.ini");
    if (!existsSync(ini)) continue;
    try {
      const text = readFileSync(ini, "utf8");
      let defaultPath: string | null = null;
      let curPath: string | null = null;
      let isDefault = false;
      for (const line of text.split("\n")) {
        if (line.startsWith("[")) {
          if (isDefault && curPath) defaultPath = curPath;
          curPath = null;
          isDefault = false;
          continue;
        }
        if (line.startsWith("Path=")) curPath = line.slice(5).trim();
        if (line === "Default=1") isDefault = true;
      }
      if (isDefault && curPath) defaultPath = curPath;
      if (defaultPath) {
        const abs = defaultPath.startsWith("/")
          ? defaultPath
          : resolve(base, defaultPath);
        out.push(abs);
      }
      // also every Path= under base
      for (const line of text.split("\n")) {
        if (line.startsWith("Path=")) {
          const p = line.slice(5).trim();
          out.push(p.startsWith("/") ? p : resolve(base, p));
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Known local rescues
  out.push(resolve(HOME, "projects/ff-rescue"));
  out.push(resolve(HOME, ".config/mozilla/firefox/g304xzha.default-release"));

  return [...new Set(out)];
}

function readCookiesFromSqlite(profileDir: string): CookieCache | null {
  const dbPath = resolve(profileDir, "cookies.sqlite");
  if (!existsSync(dbPath)) return null;

  // Copy away from live profile (WAL lock) into a unique temp path
  const digest = createHash("sha1").update(dbPath).digest("hex").slice(0, 10);
  const tmpDir = resolve(tmpdir(), "ghas-ff-cookies");
  mkdirSync(tmpDir, { recursive: true });
  const tmpDb = resolve(tmpDir, `${digest}.sqlite`);
  try {
    copyFileSync(dbPath, tmpDb);
    const wal = `${dbPath}-wal`;
    const shm = `${dbPath}-shm`;
    if (existsSync(wal)) copyFileSync(wal, `${tmpDb}-wal`);
    if (existsSync(shm)) copyFileSync(shm, `${tmpDb}-shm`);
  } catch {
    return null;
  }

  try {
    const db = new Database(tmpDb, { readonly: true });
    const placeholders = COOKIE_NAMES.map(() => "?").join(",");
    const rows = db
      .query(
        `SELECT name, value FROM moz_cookies
         WHERE host LIKE '%github.com%' AND name IN (${placeholders})`,
      )
      .all(...COOKIE_NAMES) as Array<{ name: string; value: string }>;
    db.close();
    if (!rows.length) return null;
    const map = new Map(rows.map((r) => [r.name, r.value]));
    const user_session = map.get("user_session") ?? "";
    if (!user_session) return null;
    const cookie = rows.map((r) => `${r.name}=${r.value}`).join("; ");
    return {
      cookie,
      user_session,
      source: `firefox:${profileDir}`,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/** Refresh cookie jar from env or Firefox profile (cheap; call before web search). */
export function refreshGithubWebSession(force = false): CookieCache | null {
  if (
    !force &&
    cookieCache &&
    Date.now() - cookieCache.fetchedAt < REFRESH_MS &&
    cookieCache.user_session
  ) {
    return cookieCache;
  }

  const sessions = envSessions();
  if (sessions.length) {
    const user_session = sessions[0];
    cookieCache = {
      cookie: `user_session=${user_session}; logged_in=yes`,
      user_session,
      source: "env:GITHUB_SESSIONS",
      fetchedAt: Date.now(),
    };
    return cookieCache;
  }

  for (const profile of firefoxProfileCandidates()) {
    const hit = readCookiesFromSqlite(profile);
    if (hit) {
      cookieCache = hit;
      return cookieCache;
    }
  }

  cookieCache = null;
  return null;
}

export function hasBlackbirdSession(): boolean {
  return Boolean(refreshGithubWebSession()?.user_session);
}

/**
 * Queries that need the *new* code-search engine (Blackbird), not REST legacy.
 * REST returns 0 for path:** globs and rejects UI-only forms.
 */
export function needsBlackbirdEngine(query: string): boolean {
  if (process.env.GHAS_CODE_ENGINE === "rest") return false;
  if (process.env.GHAS_CODE_ENGINE === "blackbird") return true;
  // filename: is REST-only on current GitHub (Blackbird: "Unrecognized qualifier")
  if (/\bfilename\s*:/i.test(query) && !/\bpath\s*:\s*\*\*/i.test(query)) {
    // Pure filename: → REST. Mixed with path:** still Blackbird (rewriter handles filename).
    if (!/\bpath\s*:/i.test(query) && !/\bcontent\s*:/i.test(query) && !/\bsymbol\s*:/i.test(query)) {
      return false;
    }
  }
  // auto (default): new syntax or path:** / regex path
  if (/\bpath\s*:\s*\*\*/i.test(query)) return true;
  if (/\bpath\s*:\s*\//i.test(query)) return true; // path:/(^|\/)…$/ or path:/src/
  if (/\bpath\s*:\s*"[^"]*\*[^"]*"/i.test(query)) return true;
  if (/\bcontent\s*:/i.test(query)) return true;
  if (/\bsymbol\s*:/i.test(query)) return true;
  if (/\/(?!\*)[^/\n]+\/[a-z]*/.test(query) && /\bpath\s*:/i.test(query))
    return true;
  // Prefer Blackbird whenever a session exists and user asked for path: (substring semantics differ)
  if (/\bpath\s*:/i.test(query) && hasBlackbirdSession()) return true;
  return false;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchBlackbirdCode(
  query: string,
  perPage = 20,
  page = 1,
): Promise<BlackbirdSearchResult> {
  const session = refreshGithubWebSession(false);
  if (!session) {
    return {
      results: [],
      result_count: 0,
      page_count: null,
      logged_in: false,
      engine: "blackbird",
      session_source: "none",
    };
  }

  const url = new URL(`${WEB_ROOT}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("type", "code");
  if (page > 1) url.searchParams.set("p", String(page));

  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0 GHAS-blackbird/1.0",
      "x-requested-with": "XMLHttpRequest",
      cookie: session.cookie,
      referer: `${WEB_ROOT}/search`,
    },
  });

  if (!res.ok) {
    // Force refresh once on auth failure
    if (res.status === 401 || res.status === 403) {
      refreshGithubWebSession(true);
    }
    throw new Error(`Blackbird search HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    payload?: {
      results?: BlackbirdHit[];
      result_count?: number;
      page_count?: number | null;
      logged_in?: boolean;
      errors?: unknown[];
    };
  };
  const payload = json.payload ?? {};
  if (payload.logged_in === false) {
    // Session dead — force next refresh from Firefox
    cookieCache = null;
  }

  let results = Array.isArray(payload.results) ? payload.results : [];
  if (perPage > 0 && results.length > perPage) {
    results = results.slice(0, perPage);
  }

  return {
    results,
    result_count: Number(payload.result_count ?? results.length),
    page_count: payload.page_count ?? null,
    logged_in: Boolean(payload.logged_in),
    engine: "blackbird",
    session_source: session.source,
  };
}

/** Optional exact count via blackbird_count (harvester pattern). */
export async function blackbirdCount(query: string): Promise<number | null> {
  const session = refreshGithubWebSession(false);
  if (!session) return null;
  const enc = encodeURIComponent(query).replace(/%20/g, "+");
  const url = `${WEB_ROOT}/search/blackbird_count?saved_searches=&q=${enc}`;
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 GHAS-blackbird/1.0",
      "x-requested-with": "XMLHttpRequest",
      cookie: session.cookie,
      referer: `${WEB_ROOT}/search?q=${enc}&type=code`,
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    failed?: boolean;
    count?: number;
  };
  if (data.failed) return null;
  return typeof data.count === "number" ? data.count : null;
}

export function blackbirdHitToGithubItem(hit: BlackbirdHit) {
  const repo = hit.repo_nwo || "";
  const path = hit.path || "";
  const ref = (hit.ref_name || "HEAD").replace(/^refs\/heads\//, "");
  const html_url = `https://github.com/${repo}/blob/${hit.commit_sha || ref}/${path}`;
  const snippetLines = hit.snippets?.[0]?.lines ?? [];
  const snippet = stripHtml(snippetLines.join("\n"));
  return {
    name: path.split("/").pop() || path,
    path,
    sha: hit.blob_sha,
    html_url,
    repository: {
      full_name: repo,
      html_url: `https://github.com/${repo}`,
      description: undefined,
      stargazers_count: 0,
      language: hit.language_name,
    },
    score: 1 + (hit.match_count ?? 0),
    text_matches: snippet
      ? [{ fragment: snippet, property: "content" }]
      : [],
  };
}

// silence unused dirname import if tree-shaken differently
void dirname;
