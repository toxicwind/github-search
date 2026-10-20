import type { SearchCategory } from "@ghas/contracts";

export type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  category?: SearchCategory | "meta";
};

const q = { type: "string" as const };
const perPage = { type: "number" as const, description: "Results limit (default 20, max 100)" };
const strict = { type: "boolean" as const, description: "Strict query filtering" };

function searchSchema(category: SearchCategory, extra?: Record<string, unknown>) {
  return {
    type: "object",
    properties: { query: q, q: q, per_page: perPage, strict, ...extra },
    required: [],
    anyOf: [{ required: ["query"] }, { required: ["q"] }],
  };
}

/** One MCP tool per GitHub search surface — pick the narrow tool, not a mega-search. */
export const GHAS_TOOLS: ToolDef[] = [
  {
    name: "ghas_health",
    description: "GHAS MCP health + GitHub auth probe (toxicwind/github-advanced-search-mcp).",
    category: "meta",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ghas_search_code",
    description:
      "Dual-engine GitHub code search. GHAS_CODE_ENGINE=auto (default): Blackbird (github.com/search UI index) when web session + path:** / path:/…/ / content: / symbol: (or any path: with session); classic REST /search/code otherwise. Qualifiers are NOT interchangeable — never rewrite filename:↔path:. filename:NAME = basename/leaf (REST); path:SEG = path substring; path:**/… = Blackbird-only globs. Prefer filename:.zshrc for basename; path:src for dirs; path:**/*.toml for globs.",
    category: "code",
    inputSchema: searchSchema("code"),
  },
  {
    name: "ghas_search_repositories",
    description: "Search GitHub repositories only (stars, topics, language filters).",
    category: "repositories",
    inputSchema: searchSchema("repositories"),
  },
  {
    name: "ghas_search_issues",
    description: "Search GitHub issues index (not PRs) via code search ranking.",
    category: "issues",
    inputSchema: searchSchema("issues"),
  },
  {
    name: "ghas_search_pull_requests",
    description: "Search GitHub pull requests only.",
    category: "pull_requests",
    inputSchema: searchSchema("pull_requests"),
  },
  {
    name: "ghas_search_users",
    description: "Search GitHub users.",
    category: "users",
    inputSchema: searchSchema("users"),
  },
  {
    name: "ghas_search_commits",
    description: "Search GitHub commits.",
    category: "commits",
    inputSchema: searchSchema("commits"),
  },
  {
    name: "ghas_search_discussions",
    description: "Search GitHub discussions.",
    category: "discussions",
    inputSchema: searchSchema("discussions"),
  },
  {
    name: "ghas_search_packages",
    description: "Search GitHub packages.",
    category: "packages",
    inputSchema: searchSchema("packages"),
  },
  {
    name: "ghas_search_unified",
    description: "Smart unified GitHub search (auto-routes intent). Prefer a specific ghas_search_* tool when possible.",
    category: "unified",
    inputSchema: searchSchema("unified"),
  },
  {
    name: "ghas_compare_search",
    description: "Compare GHAS optimized ranking vs raw GitHub API ranking for one query.",
    category: "meta",
    inputSchema: {
      type: "object",
      properties: { query: q, per_page: perPage },
      required: ["query"],
    },
  },
  {
    name: "ghas_get_repository",
    description: "Get one repo metadata (owner/repo) — stars, topics, default branch, etc.",
    category: "meta",
    inputSchema: {
      type: "object",
      properties: { owner: q, repo: q },
      required: ["owner", "repo"],
    },
  },
  {
    name: "ghas_get_file_contents",
    description: "Read a file from a GitHub repo (owner/repo/path, optional ref).",
    category: "meta",
    inputSchema: {
      type: "object",
      properties: {
        owner: q,
        repo: q,
        path: q,
        ref: { type: "string", description: "branch, tag, or SHA" },
      },
      required: ["owner", "repo", "path"],
    },
  },
  {
    name: "ghas_query_issues",
    description: "GitHub Issues API search (cross-repo query syntax: is:open label:bug repo:owner/name).",
    category: "meta",
    inputSchema: {
      type: "object",
      properties: {
        query: q,
        per_page: perPage,
        state: { type: "string", enum: ["open", "closed", "all"] },
      },
      required: ["query"],
    },
  },
  {
    name: "ghas_list_repo_issues",
    description: "List issues in one repository (owner + repo, optional labels/state).",
    category: "meta",
    inputSchema: {
      type: "object",
      properties: {
        owner: q,
        repo: q,
        state: { type: "string", enum: ["open", "closed", "all"] },
        per_page: perPage,
        labels: { type: "string", description: "Comma-separated label names" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "ghas_simple_search",
    description: "Compact unified search for small LLMs (max 5 results).",
    category: "unified",
    inputSchema: {
      type: "object",
      properties: { query: q, per_page: { type: "number", description: "Max 5" } },
      required: ["query"],
    },
  },
  {
    name: "ghas_rank_debug",
    description:
      "Code search with ranking debug: top hits + scores + engine flags (Blackbird session, experimental rank).",
    category: "meta",
    inputSchema: {
      type: "object",
      properties: {
        query: q,
        per_page: perPage,
        strict,
      },
      required: ["query"],
    },
  },
  {
    name: "ghas_engine_info",
    description:
      "Report dual-engine + ranker config: Blackbird session, GHAS_CODE_ENGINE, GHAS_EXPERIMENTAL_RANK, tool list.",
    category: "meta",
    inputSchema: { type: "object", properties: {} },
  },
  // Legacy aliases (Cursor/Grok caches may still reference these)
  {
    name: "github_search",
    description: "[alias] Use ghas_search_* instead. Optional categories array.",
    category: "unified",
    inputSchema: {
      type: "object",
      properties: {
        query: q,
        categories: { type: "array", items: { type: "string" } },
        per_page: perPage,
        strict,
      },
      required: ["query"],
    },
  },
  { name: "github_compare", description: "[alias] → ghas_compare_search", category: "meta", inputSchema: { type: "object", properties: { query: q, per_page: perPage }, required: ["query"] } },
  { name: "github_get_repository", description: "[alias] → ghas_get_repository", category: "meta", inputSchema: { type: "object", properties: { owner: q, repo: q }, required: ["owner", "repo"] } },
  { name: "github_get_file_contents", description: "[alias] → ghas_get_file_contents", category: "meta", inputSchema: { type: "object", properties: { owner: q, repo: q, path: q, ref: { type: "string" } }, required: ["owner", "repo", "path"] } },
  { name: "github_search_issues", description: "[alias] → ghas_query_issues", category: "meta", inputSchema: { type: "object", properties: { query: q, per_page: perPage, state: { type: "string", enum: ["open", "closed", "all"] } }, required: ["query"] } },
  { name: "github_list_issues", description: "[alias] → ghas_list_repo_issues", category: "meta", inputSchema: { type: "object", properties: { owner: q, repo: q, state: { type: "string", enum: ["open", "closed", "all"] }, per_page: perPage, labels: { type: "string" } }, required: ["owner", "repo"] } },
  { name: "estate-scripts_simple_search", description: "[alias] → ghas_simple_search", category: "unified", inputSchema: { type: "object", properties: { query: q, per_page: { type: "number" } }, required: ["query"] } },
];

export const TOOL_BY_NAME = new Map(GHAS_TOOLS.map((t) => [t.name, t]));