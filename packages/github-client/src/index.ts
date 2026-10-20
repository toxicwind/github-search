import type {
  SearchCategory,
  SearchResult,
  RepositoryInfo,
  FileContent,
  IssueItem,
} from "@ghas/contracts";
import {
  applyExperimentalRanking,
  experimentalRankEnabled,
} from "./ranking/index.ts";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import {
  blackbirdHitToGithubItem,
  hasBlackbirdSession,
  needsBlackbirdEngine,
  refreshGithubWebSession,
  searchBlackbirdCode,
} from "./blackbird";

export {
  blackbirdHitToGithubItem,
  hasBlackbirdSession,
  needsBlackbirdEngine,
  refreshGithubWebSession,
  searchBlackbirdCode,
};

const HOME = process.env.HOME ?? "/home/toxic";

/** SSOT: ~/.secrets (home), not ~/.grok/.secrets */
function loadHomeSecrets() {
  for (const file of [resolve(HOME, ".secrets"), resolve(HOME, ".env")]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const eq = line.indexOf("=");
      const key = line.slice(0, eq).trim();
      if (!key || process.env[key]) continue;
      const raw = line.slice(eq + 1).trim();
      process.env[key] = raw.replace(/^['"]|['"]$/g, "");
    }
  }
}

loadHomeSecrets();

const API_ROOT = "https://api.github.com";
const CACHE_DIR = resolve(process.env.HOME ?? "/home/toxic", ".gh-search-cache");
const SEARCH_PROFILE_VERSION = "2026-08-06-a";
const REQUEST_INTERVAL_MS = Number(process.env.GHAS_GITHUB_MIN_INTERVAL_MS ?? "150");
const RETRY_LIMIT = Number(process.env.GHAS_GITHUB_RETRY_LIMIT ?? "4");
const BASE_RETRY_MS = Number(process.env.GHAS_GITHUB_RETRY_BASE_MS ?? "750");
const SUPPLEMENTAL_ENABLED = process.env.GHAS_SUPPLEMENTAL_QUERIES !== "0";
const SUPPLEMENTAL_LIMIT = Number(process.env.GHAS_SUPPLEMENTAL_LIMIT ?? "2");
const RESCUE_ENABLED = process.env.GHAS_RESCUE_QUERIES !== "0";
const RESCUE_MIN_RESULTS = Number(process.env.GHAS_RESCUE_MIN_RESULTS ?? "8");
const RESCUE_PER_PAGE_FACTOR = Number(
  process.env.GHAS_RESCUE_PER_PAGE_FACTOR ?? "2",
);

type SearchOptions = {
  query: string;
  categories: SearchCategory[];
  perPage: number;
  raw?: boolean;
  strict?: boolean;
};

export type SearchTelemetry = {
  strict_applied: boolean;
  supplemental_disabled: boolean;
  category_plan: SearchCategory[];
  filter_stats: {
    before_filter: number;
    after_filter: number;
    dropped: number;
  };
};

export type SearchDetailed = {
  results: SearchResult[];
  telemetry: SearchTelemetry;
};

type GithubSearchItem = Record<string, any>;
type CacheEntry = {
  expiresAt: number;
  results: SearchResult[];
};

const resultCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<SearchResult[]>>();
const CACHE_TTL_MS = 5 * 60 * 1000;
let lastRequestAt = 0;
let cachedHeaders: Record<string, string> | null = null;
const CODE_INTENT_WORDS = [
  "token",
  "gateway",
  "auth",
  "oauth",
  "callback",
  "config",
  "env",
  "redirect",
  "docs",
  "path",
  "service",
  "json",
  "kdl",
];
const REPO_INTENT_WORDS = [
  "repo",
  "repository",
  "fork",
  "plugin",
  "framework",
  "library",
  "project",
  "server",
  "client",
];

export function resolveGithubToken(): { token: string; source: string } {
  loadHomeSecrets();
  if (process.env.GH_TOKEN)
    return { token: process.env.GH_TOKEN, source: "env:GH_TOKEN" };
  if (process.env.GITHUB_TOKEN)
    return { token: process.env.GITHUB_TOKEN, source: "env:GITHUB_TOKEN" };
  try {
    const token = execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
    }).trim();
    if (token) return { token, source: "gh-cli" };
  } catch {}
  return { token: "", source: "none" };
}

function githubHeaders() {
  const { token } = resolveGithubToken();
  const headers: Record<string, string> = {
    accept: "application/vnd.github.text-match+json",
    "user-agent": "github-advanced-search-mcp/0.6.0",
    "x-github-api-version": "2022-11-28",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  cachedHeaders = headers;
  return headers;
}

function cacheKey(options: SearchOptions) {
  return JSON.stringify({
    v: SEARCH_PROFILE_VERSION,
    q: options.query,
    c: options.categories,
    p: options.perPage,
    raw: options.raw ?? false,
  });
}

function cacheFilePath(key: string) {
  const digest = createHash("sha1").update(key).digest("hex");
  return resolve(CACHE_DIR, `${digest}.json`);
}

function readCache(key: string, allowExpired = false) {
  const memory = resultCache.get(key);
  if (memory && (allowExpired || memory.expiresAt > Date.now()))
    return memory.results;
  const file = cacheFilePath(key);
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as CacheEntry;
    if (
      (allowExpired || parsed.expiresAt > Date.now()) &&
      Array.isArray(parsed.results)
    ) {
      resultCache.set(key, parsed);
      return parsed.results;
    }
  } catch {}
  return null;
}

function writeCache(key: string, results: SearchResult[]) {
  const entry = { results, expiresAt: Date.now() + CACHE_TTL_MS };
  resultCache.set(key, entry);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cacheFilePath(key), JSON.stringify(entry));
}

/** GitHub search qualifiers that MUST pass through untouched to the API. */
const GH_QUALIFIER_RE =
  /\b(filename|path|extension|language|repo|user|org|in|size|followers|forks|stars|created|pushed|topic|is|type|label|no|mirror|archived|license|vendor|target)\s*:/i;

function hasGithubQualifiers(query: string) {
  return GH_QUALIFIER_RE.test(query);
}

/** Qualifier keys that must not be required in result text for strict gates. */
const QUALIFIER_META_TOKENS = new Set([
  "filename",
  "path",
  "extension",
  "language",
  "repo",
  "user",
  "org",
  "in",
  "size",
  "followers",
  "forks",
  "stars",
  "created",
  "pushed",
  "topic",
  "is",
  "type",
  "label",
  "no",
  "mirror",
  "archived",
  "license",
  "vendor",
  "target",
]);

/**
 * GitHub REST code search still accepts both qualifiers; they are NOT aliases.
 * - filename:NAME  → match by basename / file leaf (e.g. .zshrc, package.json)
 * - path:SEGMENT   → match if SEGMENT appears anywhere in the file path
 * New github.com UI often rejects `filename:` and steers users to `path:`, but
 * path: is broader/narrower depending on value — never rewrite one into the other.
 * Empirically (2026-07): filename:.zshrc ~45k; path:.zshrc ~40; path:.zshrc+term can be 0.
 */
function parseFilenameQualifier(query: string): string | null {
  const m = query.match(/\bfilename\s*:\s*([^\s]+)/i);
  return m?.[1] ?? null;
}

function parsePathQualifier(query: string): string | null {
  const m = query.match(/\bpath\s*:\s*([^\s]+)/i);
  return m?.[1] ?? null;
}

/** Basename-only match for filename: (never full-path substring). */
function basenameMatchesFilename(path: string, filename: string): boolean {
  const leaf = (path.split("/").pop() || path).toLowerCase();
  const f = filename.toLowerCase();
  if (!leaf || !f) return false;
  // Exact leaf, or leaf is filename + extra suffix (.zshrc.md), or leaf ends with /filename style
  return leaf === f || leaf.startsWith(`${f}.`) || leaf.endsWith(f);
}

function plannedCategories(query: string, categories: SearchCategory[]) {
  if (!categories.includes("unified")) return categories;
  const lowered = query.toLowerCase();
  const tokens = tokenize(query);
  // Code-path qualifiers force code search (never repo supplemental)
  if (
    /\b(filename|path|extension)\s*:/i.test(query) ||
    /\bin\s*:\s*(file|path)\b/i.test(query)
  ) {
    return ["code"];
  }
  if (
    lowered.includes("topic:") ||
    (lowered.includes("language:") && !lowered.includes("filename:")) ||
    lowered.includes("stars:")
  ) {
    return ["repositories", "code"];
  }
  if (lowered.includes("user:") || lowered.startsWith("@")) {
    return ["users"];
  }
  // Broad default for maximum recall across repositories, code, and issues
  return ["repositories", "code", "issues"];
}

function strictCategories(categories: SearchCategory[]) {
  const base = categories.filter((category) => category !== "unified");
  if (base.length) return [...new Set(base)];
  return [
    "code",
    "repositories",
    "issues",
    "pull_requests",
  ] as SearchCategory[];
}

function supplementalQueries(query: string) {
  const tokens = tokenize(query).slice(0, 5);
  const extra = new Set<string>();
  
  // Generate hyphenated variants
  if (tokens.length >= 2) {
    for (let i = 0; i < tokens.length - 1; i++) {
      extra.add(`${tokens[i]}-${tokens[i + 1]}`);
    }
  }
  if (tokens.length >= 3) {
    extra.add(tokens.slice(0, 3).join("-"));
    extra.add(tokens.join("-"));
  }
  
  // Add language-qualified variants for code search
  extra.add(`${query} language:typescript`);
  extra.add(`${query} language:javascript`);
  extra.add(`${query} language:rust`);
  extra.add(`${query} language:go`);
  extra.add(`${query} language:python`);
  
  // Add topic/repo variants
  extra.add(`${query} in:readme`);
  extra.add(`${query} in:description`);
  
  return [...extra].filter((candidate) => candidate.length >= 5).slice(0, 10);
}

function buildRequestQuery(
  category: SearchCategory,
  query: string,
  suffix: string,
) {
  // CRITICAL: never rewrite queries that already use GitHub qualifiers
  // (filename:.zshrc became "filename" zshrc — destroyed code search).
  if (hasGithubQualifiers(query)) {
    return [query.trim(), suffix].filter(Boolean).join(" ");
  }
  const tokens = tokenize(query);
  if (category === "code" && tokens.length >= 3) {
    const [first, ...rest] = tokens;
    return [`"${first}"`, ...rest, suffix].filter(Boolean).join(" ");
  }
  return [query, suffix].filter(Boolean).join(" ");
}

function mapCategory(
  category: SearchCategory,
): { endpoint: string; q: string } | null {
  switch (category) {
    case "repositories":
      return { endpoint: "repositories", q: "" };
    case "code":
      return { endpoint: "code", q: "" };
    case "issues":
      return { endpoint: "issues", q: "is:issue" };
    case "pull_requests":
      return { endpoint: "issues", q: "is:pr" };
    case "users":
      return { endpoint: "users", q: "" };
    default:
      return null;
  }
}

function scoreFor(
  item: GithubSearchItem,
  category: SearchCategory,
  raw = false,
) {
  const base = Number(item.score ?? 0);
  if (raw) return base;
  const stars = Number(
    item.stargazers_count ?? item.repository?.stargazers_count ?? 0,
  );
  const forks = Number(item.forks_count ?? item.repository?.forks_count ?? 0);
  const relevance = Math.min(40, stars / 250 + forks / 100);
  const freshness = item.updated_at
    ? Math.max(
        0,
        20 - (Date.now() - Date.parse(item.updated_at)) / 86400000 / 30,
      )
    : 0;
  const codeBias = category === "code" ? 8 : 0;
  return base + relevance + freshness + codeBias;
}

function intentCategoryBoost(query: string, category: SearchCategory) {
  const lowered = query.toLowerCase();
  if (
    category === "code" &&
    CODE_INTENT_WORDS.some((word) => lowered.includes(word))
  )
    return 28;
  if (
    category === "repositories" &&
    REPO_INTENT_WORDS.some((word) => lowered.includes(word))
  )
    return 18;
  return 0;
}

function exactMatchBonus(
  query: string,
  item: GithubSearchItem,
  category: SearchCategory,
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return 0;
  const tokens = tokenize(query);
  const repo = String(
    item.full_name || item.repository?.full_name || "",
  ).toLowerCase();
  const name = String(item.name || item.path || item.title || "").toLowerCase();
  const description = String(
    item.description || item.repository?.description || "",
  ).toLowerCase();
  let bonus = 0;
  if (repo === normalizedQuery || name === normalizedQuery) bonus += 20;
  if (repo.endsWith(`/${normalizedQuery}`)) bonus += 14;
  if (name.includes(normalizedQuery)) bonus += 8;
  if (description.includes(normalizedQuery)) bonus += 4;
  if (category === "repositories" && repo.includes(normalizedQuery)) bonus += 6;
  if (tokens.length) {
    const anchor = tokens[0];
    if (repo === `${anchor}/${anchor}`) bonus += 28;
    if (repo.startsWith(`${anchor}/`)) bonus += 14;
    if (repo.endsWith(`/${anchor}`)) bonus += 10;
  }
  return bonus;
}

function tokenize(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9_.-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function lexicalScore(
  query: string,
  haystacks: Array<string | undefined>,
  category: SearchCategory,
  path?: string,
) {
  const tokens = tokenize(query);
  if (!tokens.length) return 0;
  const corpus = haystacks.filter(Boolean).join(" ").toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (corpus.includes(token)) score += 3;
  }
  if (category === "repositories") score += 4;
  if (
    path &&
    /^(readme|api|news|changelog|docs?)(\.|$)/i.test(
      path.split("/").pop() || "",
    )
  ) {
    score -= 6;
  }
  return score;
}

function normalizeItem(
  category: SearchCategory,
  item: GithubSearchItem,
  raw = false,
): SearchResult {
  const ownerLogin =
    item.owner?.login ||
    item.repository?.owner?.login ||
    item.author?.login ||
    "";
  const repository =
    item.full_name ||
    item.repository?.full_name ||
    (ownerLogin && item.name ? `${ownerLogin}/${item.name}` : "");
  const path = item.path;
  const title =
    category === "code"
      ? path || item.name || repository
      : item.title || item.full_name || item.login || item.name || repository;
  const subtitle =
    item.description ||
    item.repository?.description ||
    item.body?.slice(0, 240) ||
    item.commit?.message ||
    undefined;
  const snippet =
    item.text_matches?.map((match: any) => match.fragment).join("\n") ||
    item.body?.slice(0, 400) ||
    item.commit?.message ||
    undefined;
  return {
    category,
    repository,
    path,
    url: item.html_url || item.repository?.html_url || item.url,
    raw_url: item.url,
    title,
    subtitle,
    snippet,
    language: item.language || item.repository?.language,
    stars: item.stargazers_count ?? item.repository?.stargazers_count,
    forks: item.forks_count ?? item.repository?.forks_count,
    score: scoreFor(item, category, raw),
    updated_at: item.updated_at,
    highlights: item.text_matches?.map((match: any) => match.fragment) ?? [],
    isEmergent:
      (item.archived === false && (item.stargazers_count ?? 0) < 80) || false,
    evaluation: category === "code" ? "STRUCTURAL_MATCH" : undefined,
    latentScore: Math.min(99, Math.round(scoreFor(item, category, raw))),
  };
}

function isUsefulResult(result: SearchResult) {
  return Boolean(
    result.url &&
    result.title &&
    (result.repository || result.category === "users"),
  );
}

function strictResultGate(query: string, result: SearchResult) {
  // Content tokens only — drop qualifier meta keys (filename/path/extension/…)
  let tokens = tokenize(query).filter((t) => !QUALIFIER_META_TOKENS.has(t));
  const path = (result.path || result.title || "").toLowerCase();

  // filename: → basename semantics only (≠ path: substring)
  const fn = parseFilenameQualifier(query);
  if (fn) {
    const base = fn.replace(/^\./, "").toLowerCase();
    tokens = tokens.filter((t) => t !== base && t !== fn.toLowerCase());
    if (!basenameMatchesFilename(path, fn)) return false;
  }

  // path: → full-path substring (do not require basename match)
  const pq = parsePathQualifier(query);
  if (pq) {
    const p = pq.toLowerCase();
    tokens = tokens.filter((t) => t !== p && t !== p.replace(/^\.\//, ""));
    if (!path.includes(p)) return false;
  }

  if (!tokens.length) return true;
  const corpus = [
    result.repository,
    result.title,
    result.subtitle,
    result.snippet,
    result.path,
    result.language,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const hitCount = tokens.filter((token) => corpus.includes(token)).length;
  if (tokens.length <= 2) return hitCount === tokens.length;
  if (tokens.length <= 4) return hitCount >= tokens.length - 1;
  return hitCount >= Math.max(3, Math.ceil(tokens.length * 0.6));
}

/**
 * Separate boosts: filename: scores basename hits; path: scores path substring.
 * Never treat path.includes(filename) as a strong filename match (dirs named .zshrc etc.).
 */
function pathQualifierBoost(query: string, result: SearchResult) {
  if (result.category !== "code") return 0;
  const path = (result.path || "").toLowerCase();
  if (!path) return 0;
  let bonus = 0;
  const fn = parseFilenameQualifier(query);
  if (fn) {
    const leaf = path.split("/").pop() || "";
    const f = fn.toLowerCase();
    if (leaf === f) bonus += 80;
    else if (leaf.startsWith(`${f}.`) || leaf.endsWith(f)) bonus += 55;
    // Weak only if full path has the token but leaf does not — not a filename hit
    else if (path.includes(f)) bonus += 5;
  }
  const pq = parsePathQualifier(query);
  if (pq) {
    const p = pq.toLowerCase();
    if (path.includes(p)) {
      // Prefer path segment boundaries over accidental substrings
      if (path === p || path.endsWith(`/${p}`) || path.startsWith(`${p}/`))
        bonus += 50;
      else bonus += 35;
    }
  }
  const em = query.match(/\bextension\s*:\s*([^\s]+)/i);
  if (em?.[1] && path.endsWith(`.${em[1].toLowerCase().replace(/^\./, "")}`))
    bonus += 30;
  return bonus;
}

function parseResetMs(resetHeader: string | null) {
  const epochSeconds = Number(resetHeader ?? "0");
  if (!Number.isFinite(epochSeconds) || epochSeconds <= 0) return 0;
  const ms = epochSeconds * 1000 - Date.now();
  return Math.max(0, ms);
}

function parseRetryAfterMs(header: string | null) {
  const seconds = Number(header ?? "0");
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return seconds * 1000;
}

async function throttleInterval() {
  const now = Date.now();
  const waitMs = Math.max(0, REQUEST_INTERVAL_MS - (now - lastRequestAt));
  if (waitMs > 0) await Bun.sleep(waitMs);
  lastRequestAt = Date.now();
}

async function fetchGithub(url: URL) {
  let lastResponse: Response | null = null;
  let lastError = "";
  for (let attempt = 0; attempt <= RETRY_LIMIT; attempt += 1) {
    await throttleInterval();
    const response = await fetch(url, { headers: githubHeaders() });
    if (response.ok || response.status === 404) return response;
    const status = response.status;
    const body = await response.text();
    lastResponse = response;
    lastError = body.slice(0, 300);
    const retryable =
      status === 403 ||
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      body.toLowerCase().includes("rate limit");
    if (!retryable || attempt >= RETRY_LIMIT) break;
    const waitMs = Math.max(
      BASE_RETRY_MS * Math.pow(2, attempt),
      parseRetryAfterMs(response.headers.get("retry-after")),
      parseResetMs(response.headers.get("x-ratelimit-reset")),
    );
    await Bun.sleep(waitMs);
  }
  if (lastResponse) {
    throw new Error(`GitHub ${lastResponse.status}: ${lastError}`);
  }
  throw new Error("GitHub request failed");
}

async function searchCategory(
  category: SearchCategory,
  query: string,
  perPage: number,
  raw = false,
) {
  const mapped = mapCategory(category);
  if (!mapped) return [] as SearchResult[];
  return searchCategoryQuery(
    category,
    buildRequestQuery(category, query, mapped.q),
    query,
    perPage,
    raw,
  );
}

function scoreMappedItems(
  category: SearchCategory,
  items: GithubSearchItem[],
  sourceQuery: string,
  raw = false,
  opts: { listPositionPrior?: boolean } = {},
) {
  const mapped = items.map((item) => {
    const normalized = normalizeItem(category, item, raw);
    const lexical = lexicalScore(
      sourceQuery,
      [
        normalized.repository,
        normalized.title,
        normalized.subtitle,
        normalized.snippet,
        normalized.language,
      ],
      category,
      normalized.path,
    );
    const exact = exactMatchBonus(sourceQuery, item, category);
    const pathBoost = pathQualifierBoost(sourceQuery, normalized);
    const total =
      normalized.score +
      lexical +
      exact +
      intentCategoryBoost(sourceQuery, category) +
      pathBoost;
    return {
      ...normalized,
      score: total,
      latentScore: Math.min(99, Math.round(total)),
    };
  });

  // W1: RELEVANCE-FIRST experimental ranker (5a70003) — default on
  if (!raw && experimentalRankEnabled()) {
    return applyExperimentalRanking(mapped, sourceQuery, {
      listPositionPrior: opts.listPositionPrior === true,
    });
  }
  return mapped;
}

async function searchCategoryQuery(
  category: SearchCategory,
  requestQuery: string,
  sourceQuery: string,
  perPage: number,
  raw = false,
) {
  const mapped = mapCategory(category);
  if (!mapped) return [] as SearchResult[];

  // Dual engine for code (parity with github.com/search?type=code):
  // - REST owns pure `filename:` (Blackbird: "Unrecognized qualifier" → garbage).
  // - With a browser session, prefer Blackbird for everything else so GHAS
  //   matches the UI index (REST total_count/ranking diverge badly).
  // - path:** / content: / symbol: always Blackbird when session present.
  const pureFilename =
    /\bfilename\s*:/i.test(requestQuery) &&
    !/\bpath\s*:/i.test(requestQuery) &&
    !/\bcontent\s*:/i.test(requestQuery) &&
    !/\bsymbol\s*:/i.test(requestQuery);
  const useBlackbird =
    category === "code" &&
    hasBlackbirdSession() &&
    !pureFilename &&
    (needsBlackbirdEngine(requestQuery) ||
      process.env.GHAS_CODE_ENGINE !== "rest");
  if (useBlackbird) {
    try {
      // If mixed query still has filename:, rewrite to path:**/NAME for Blackbird
      let bbQuery = requestQuery;
      if (/\bfilename\s*:/i.test(bbQuery) && !/\bpath\s*:\s*\*\*/i.test(bbQuery)) {
        bbQuery = bbQuery.replace(
          /\bfilename\s*:\s*([^\s)]+)/gi,
          (_m, name: string) => `path:**/${name.replace(/^\/+/, "")}`,
        );
      }
      const bb = await searchBlackbirdCode(bbQuery, perPage, 1);
      if (bb.logged_in && bb.results.length) {
        const items = bb.results.map(blackbirdHitToGithubItem);
        return scoreMappedItems(category, items, sourceQuery, raw, {
          listPositionPrior: true,
        });
      }
      // logged out / empty: fall through to REST
    } catch {
      /* fall through to REST */
    }
  }

  const url = new URL(`${API_ROOT}/search/${mapped.endpoint}`);
  url.searchParams.set("q", requestQuery);
  url.searchParams.set("per_page", String(perPage));
  const response = await fetchGithub(url);
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 404) return [] as SearchResult[];
    throw new Error(`GitHub ${response.status}: ${body.slice(0, 300)}`);
  }
  const json = await response.json();
  const items = Array.isArray(json.items) ? json.items : [];
  return scoreMappedItems(category, items, sourceQuery, raw);
}

function dedupeResults(results: SearchResult[]) {
  const seen = new Map<string, SearchResult>();
  for (const result of results) {
    const key = `${result.category}:${result.repository}:${result.path ?? ""}:${result.url}`;
    const existing = seen.get(key);
    if (!existing || result.score > existing.score) {
      seen.set(key, result);
    }
  }
  return [...seen.values()];
}

function supplementalBoost(query: string, result: SearchResult) {
  const repo = result.repository.toLowerCase();
  const lowered = query.toLowerCase();
  const hyphenated = lowered.split(/\s+/).join("-");
  let bonus = 10;
  if (repo.includes(hyphenated)) bonus += 30;
  for (const candidate of supplementalQueries(query)) {
    if (repo.includes(candidate)) bonus += 18;
    if (repo.endsWith(`/${candidate}`)) bonus += 8;
  }
  const tokens = tokenize(query);
  if (tokens.length && repo.startsWith(`${tokens[0]}/`)) bonus += 20;
  if (tokens.length >= 2 && repo.includes(tokens[1])) bonus += 6;
  if (
    tokens.length >= 2 &&
    repo.startsWith(`${tokens[0]}/`) &&
    repo.includes(tokens[1])
  )
    bonus += 18;
  return bonus;
}

export async function searchGithubDetailed(
  options: SearchOptions,
): Promise<SearchDetailed> {
  const strict = options.strict === true;
  const unique = strict
    ? strictCategories(options.categories)
    : [...new Set(plannedCategories(options.query, options.categories))];
  const key = cacheKey({ ...options, categories: unique });
  const cached = readCache(key);
  if (cached) {
    return {
      results: cached,
      telemetry: {
        strict_applied: strict,
        supplemental_disabled: strict || !SUPPLEMENTAL_ENABLED,
        category_plan: unique,
        filter_stats: {
          before_filter: cached.length,
          after_filter: cached.length,
          dropped: 0,
        },
      },
    };
  }
  const existing = inFlight.get(key);
  if (existing) {
    const inFlightResults = await existing;
    return {
      results: inFlightResults,
      telemetry: {
        strict_applied: strict,
        supplemental_disabled: strict || !SUPPLEMENTAL_ENABLED,
        category_plan: unique,
        filter_stats: {
          before_filter: inFlightResults.length,
          after_filter: inFlightResults.length,
          dropped: 0,
        },
      },
    };
  }
  const task = (async () => {
    const chunkSize = Math.max(
      2,
      Math.ceil(options.perPage / Math.max(1, unique.length)),
    );
    let results: SearchResult[][] = [];
    try {
      for (const category of unique) {
        results.push(
          await searchCategory(category, options.query, chunkSize, options.raw),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("GitHub 403") ||
        message.includes("GitHub 429") ||
        message.toLowerCase().includes("rate limit")
      ) {
        const stale = readCache(key, true);
        if (stale) {
          return {
            results: stale,
            telemetry: {
              strict_applied: strict,
              supplemental_disabled: strict || !SUPPLEMENTAL_ENABLED,
              category_plan: unique,
              filter_stats: {
                before_filter: stale.length,
                after_filter: stale.length,
                dropped: 0,
              },
            },
          } as SearchDetailed;
        }
      }
      throw error;
    }
    let flattened = results.flat();
    const beforeFilterCount = flattened.length;
    // Never invent hyphenated repo queries when user used filename:/path: etc.
    const skipSupplemental =
      strict ||
      !SUPPLEMENTAL_ENABLED ||
      hasGithubQualifiers(options.query) ||
      unique.every((c) => c === "code");
    const extraRepoQueries = skipSupplemental
      ? []
      : supplementalQueries(options.query);
    if (extraRepoQueries.length) {
      try {
        for (const candidate of extraRepoQueries) {
          const extraResults = await searchCategoryQuery(
            "repositories",
            candidate,
            options.query,
            Math.min(4, options.perPage),
            options.raw,
          );
          flattened = flattened.concat(
            extraResults.map((result) => ({
              ...result,
              score: result.score + supplementalBoost(options.query, result),
              latentScore: Math.min(
                99,
                result.latentScore + supplementalBoost(options.query, result),
              ),
            })),
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes("GitHub 403") ||
          message.includes("GitHub 429") ||
          message.toLowerCase().includes("rate limit")
        ) {
          const stale = readCache(key, true);
          if (stale) {
            return {
              results: stale,
              telemetry: {
                strict_applied: strict,
                supplemental_disabled: strict || !SUPPLEMENTAL_ENABLED,
                category_plan: unique,
                filter_stats: {
                  before_filter: stale.length,
                  after_filter: stale.length,
                  dropped: 0,
                },
              },
            } as SearchDetailed;
          }
        }
      }
    }
    flattened = dedupeResults(flattened)
      .filter(isUsefulResult)
      .filter((result) =>
        strict ? strictResultGate(options.query, result) : true,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, options.perPage);

    const rescueThreshold = Math.max(
      2,
      Math.min(options.perPage, RESCUE_MIN_RESULTS),
    );
    if (RESCUE_ENABLED && flattened.length < rescueThreshold) {
      const rescueCategories = [
        ...new Set([
          ...plannedCategories(options.query, options.categories),
          "repositories",
          "code",
        ]),
      ];
      const rescuePerPage = Math.max(
        options.perPage,
        options.perPage * Math.max(1, RESCUE_PER_PAGE_FACTOR),
      );
      const rescueChunkSize = Math.max(
        2,
        Math.ceil(rescuePerPage / Math.max(1, rescueCategories.length)),
      );
      let rescue: SearchResult[] = [];
      try {
        for (const category of rescueCategories) {
          rescue = rescue.concat(
            await searchCategory(
              category,
              options.query,
              rescueChunkSize,
              options.raw,
            ),
          );
        }
        const rescueSupp =
          hasGithubQualifiers(options.query) ||
          unique.every((c) => c === "code")
            ? []
            : supplementalQueries(options.query).slice(
                0,
                Math.max(1, SUPPLEMENTAL_LIMIT),
              );
        for (const candidate of rescueSupp) {
          const extra = await searchCategoryQuery(
            "repositories",
            candidate,
            options.query,
            Math.min(6, rescuePerPage),
            options.raw,
          );
          rescue = rescue.concat(
            extra.map((result) => ({
              ...result,
              score: result.score + supplementalBoost(options.query, result),
              latentScore: Math.min(
                99,
                result.latentScore + supplementalBoost(options.query, result),
              ),
            })),
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes("GitHub 403") ||
          message.includes("GitHub 429") ||
          message.toLowerCase().includes("rate limit")
        ) {
          const stale = readCache(key, true);
          if (stale) {
            return {
              results: stale,
              telemetry: {
                strict_applied: strict,
                supplemental_disabled: strict || !SUPPLEMENTAL_ENABLED,
                category_plan: unique,
                filter_stats: {
                  before_filter: stale.length,
                  after_filter: stale.length,
                  dropped: 0,
                },
              },
            } as SearchDetailed;
          }
        }
      }
      flattened = dedupeResults(flattened.concat(rescue))
        .filter(isUsefulResult)
        .sort((a, b) => b.score - a.score)
        .slice(0, options.perPage);
    }
    writeCache(key, flattened);
    return {
      results: flattened,
      telemetry: {
        strict_applied: strict,
        supplemental_disabled: strict || !SUPPLEMENTAL_ENABLED,
        category_plan: unique,
        filter_stats: {
          before_filter: beforeFilterCount,
          after_filter: flattened.length,
          dropped: Math.max(0, beforeFilterCount - flattened.length),
        },
      },
    } as SearchDetailed;
  })();
  inFlight.set(
    key,
    task.then((value) => value.results),
  );
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
}

export async function searchGithub(
  options: SearchOptions,
): Promise<SearchResult[]> {
  const detailed = await searchGithubDetailed(options);
  return detailed.results;
}

// === New expanded MCP commands (proper GitHub API helpers) ===

async function ghFetch(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<any> {
  const url = new URL(`${API_ROOT}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  await throttleInterval();
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 404) return null;
    throw new Error(`GitHub ${res.status} ${path}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function getRepository(
  owner: string,
  repo: string,
): Promise<RepositoryInfo | null> {
  const data = await ghFetch(`/repos/${owner}/${repo}`);
  if (!data) return null;
  return {
    full_name: data.full_name,
    description: data.description,
    html_url: data.html_url,
    stargazers_count: data.stargazers_count ?? 0,
    forks_count: data.forks_count ?? 0,
    open_issues_count: data.open_issues_count ?? 0,
    language: data.language,
    updated_at: data.updated_at,
    private: !!data.private,
    topics: data.topics ?? [],
  };
}

export async function getFileContents(
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<FileContent | null> {
  const params: any = ref ? { ref } : {};
  const data = await ghFetch(
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    params,
  );
  if (!data || data.type !== "file") return null;
  let content = "";
  if (data.encoding === "base64" && data.content) {
    try {
      // Bun + Node cross runtime base64 decode
      if (typeof Buffer !== "undefined") {
        content = Buffer.from(data.content, "base64").toString("utf8");
      } else if (typeof atob !== "undefined") {
        content = atob(data.content);
      } else {
        content = data.content;
      }
    } catch {
      content = data.content;
    }
  } else {
    content = data.content ?? "";
  }
  return {
    path: data.path,
    content,
    encoding: data.encoding,
    size: data.size,
    html_url: data.html_url,
    download_url: data.download_url,
  };
}

export async function searchIssues(
  query: string,
  perPage = 20,
  state: "open" | "closed" | "all" = "all",
): Promise<IssueItem[]> {
  const q =
    state === "all"
      ? query
      : `${query} is:${state === "open" ? "issue" : "issue"} state:${state}`;
  const data = await ghFetch("/search/issues", { q, per_page: perPage });
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((it: any) => ({
    number: it.number,
    title: it.title,
    html_url: it.html_url,
    state: it.state,
    user: it.user ? { login: it.user.login } : undefined,
    comments: it.comments ?? 0,
    updated_at: it.updated_at,
    body: it.body?.slice(0, 800),
    labels: (it.labels ?? []).map((l: any) => ({ name: l.name })),
  }));
}

export async function listRepositoryIssues(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open",
  perPage = 20,
  labels?: string,
): Promise<IssueItem[]> {
  const params: any = {
    per_page: perPage,
    state: state === "all" ? undefined : state,
  };
  if (labels) params.labels = labels;
  const items = (await ghFetch(`/repos/${owner}/${repo}/issues`, params)) || [];
  return (Array.isArray(items) ? items : []).map((it: any) => ({
    number: it.number,
    title: it.title,
    html_url: it.html_url,
    state: it.state,
    user: it.user ? { login: it.user.login } : undefined,
    comments: it.comments ?? 0,
    updated_at: it.updated_at,
    body: it.body?.slice(0, 600),
    labels: (it.labels ?? []).map((l: any) => ({ name: l.name })),
  }));
}
