import type { SearchCategory, SearchResult } from "@ghas/contracts";

const API_ROOT = "https://api.github.com";

type SearchOptions = {
  query: string;
  categories: SearchCategory[];
  perPage: number;
  raw?: boolean;
};

type GithubSearchItem = Record<string, any>;

function githubHeaders() {
  const headers: Record<string, string> = {
    "accept": "application/vnd.github.text-match+json",
    "user-agent": "github-advanced-search-mcp/0.4.0",
    "x-github-api-version": "2022-11-28"
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

function mapCategory(category: SearchCategory): { endpoint: string; q: string } | null {
  switch (category) {
    case "repositories": return { endpoint: "repositories", q: "" };
    case "code": return { endpoint: "code", q: "" };
    case "issues": return { endpoint: "issues", q: "is:issue" };
    case "pull_requests": return { endpoint: "issues", q: "is:pr" };
    case "users": return { endpoint: "users", q: "" };
    default: return null;
  }
}

function scoreFor(item: GithubSearchItem, category: SearchCategory, raw = false) {
  const base = Number(item.score ?? 0);
  if (raw) return base;
  const stars = Number(item.stargazers_count ?? item.repository?.stargazers_count ?? 0);
  const forks = Number(item.forks_count ?? item.repository?.forks_count ?? 0);
  const relevance = Math.min(40, stars / 250 + forks / 100);
  const freshness = item.updated_at ? Math.max(0, 20 - ((Date.now() - Date.parse(item.updated_at)) / 86400000) / 30) : 0;
  const codeBias = category === "code" ? 8 : 0;
  return base + relevance + freshness + codeBias;
}

function normalizeItem(category: SearchCategory, item: GithubSearchItem, raw = false): SearchResult {
  const ownerLogin = item.owner?.login || item.repository?.owner?.login || item.author?.login || "";
  const repository =
    item.full_name ||
    item.repository?.full_name ||
    (ownerLogin && item.name ? `${ownerLogin}/${item.name}` : "");
  const path = item.path;
  const title = category === "code"
    ? (path || item.name || repository)
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
    isEmergent: (item.archived === false && (item.stargazers_count ?? 0) < 80) || false,
    evaluation: category === "code" ? "STRUCTURAL_MATCH" : undefined,
    latentScore: Math.min(99, Math.round(scoreFor(item, category, raw)))
  };
}

async function searchCategory(category: SearchCategory, query: string, perPage: number, raw = false) {
  const mapped = mapCategory(category);
  if (!mapped) return [] as SearchResult[];
  const q = [query, mapped.q].filter(Boolean).join(" ");
  const url = new URL(`${API_ROOT}/search/${mapped.endpoint}`);
  url.searchParams.set("q", q);
  url.searchParams.set("per_page", String(perPage));
  const response = await fetch(url, { headers: githubHeaders() });
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 404) return [] as SearchResult[];
    throw new Error(`GitHub ${response.status}: ${body.slice(0, 300)}`);
  }
  const json = await response.json();
  const items = Array.isArray(json.items) ? json.items : [];
  return items.map((item) => normalizeItem(category, item, raw));
}

export async function searchGithub(options: SearchOptions): Promise<SearchResult[]> {
  const categories = options.categories.includes("unified")
    ? (["repositories", "code", "issues", "pull_requests", "users"] as SearchCategory[])
    : options.categories;
  const unique = [...new Set(categories)];
  const chunkSize = Math.max(2, Math.ceil(options.perPage / Math.max(1, unique.length)));
  const results = await Promise.all(unique.map((category) => searchCategory(category, options.query, chunkSize, options.raw)));
  return results.flat().sort((a, b) => b.score - a.score).slice(0, options.perPage);
}
