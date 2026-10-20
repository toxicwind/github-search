import {
  searchGithubDetailed,
  getRepository,
  getFileContents,
  searchIssues,
  listRepositoryIssues,
  searchGithub,
  resolveGithubToken,
  hasBlackbirdSession,
  needsBlackbirdEngine,
  refreshGithubWebSession,
} from "@ghas/github-client";
import { buildResponse } from "@ghas/search-core";
import type { SearchCategory } from "@ghas/contracts";
import { TOOL_BY_NAME } from "./tools";

function resolveQuery(args: Record<string, unknown>): string {
  const raw = (args.query ?? args.q) as unknown;
  if (raw === undefined || raw === null || raw === "") {
    throw new Error("Missing required parameter: query (or q)");
  }
  if (typeof raw !== "string") {
    throw new Error("Query must be a string");
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    throw new Error("Query cannot be empty");
  }
  return trimmed;
}

export async function performSearch(
  query: string,
  perPage = 20,
  categories: SearchCategory[] = ["unified"],
  raw = false,
  strict = false,
) {
  const start = performance.now();
  const detailed = await searchGithubDetailed({ query, categories, perPage, raw, strict });
  return {
    ...buildResponse(
      { query, categories, per_page: perPage, smart: true, strict },
      detailed.results,
      Math.round(performance.now() - start),
    ),
    telemetry: detailed.telemetry,
  };
}

export async function performCompare(query: string, perPage = 20) {
  const start = performance.now();
  const [optimised, raw] = await Promise.all([
    searchGithub({ query, categories: ["unified"], perPage, raw: false }),
    searchGithub({ query, categories: ["unified"], perPage, raw: true }),
  ]);
  return {
    query,
    optimised,
    raw,
    meta: {
      optimised_count: optimised.length,
      raw_count: raw.length,
      time_ms: Math.round(performance.now() - start),
    },
  };
}

export async function ghasHealth() {
  let ghAuth = false;
  let ghUser = "";
  try {
    const proc = Bun.spawn(["gh", "auth", "status"], { stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    ghAuth = proc.exitCode === 0;
    const m = out.match(/account (\S+)/);
    ghUser = m?.[1] ?? "";
  } catch {
    const resolved = resolveGithubToken();
    ghAuth = !!resolved.token;
    if (!ghUser && resolved.source.startsWith("env:")) ghUser = "token-from-home-secrets";
  }
  const resolved = resolveGithubToken();
  const webSession = refreshGithubWebSession(false);
  const blackbird = hasBlackbirdSession();
  const codeEngine = process.env.GHAS_CODE_ENGINE ?? "auto";
  const experimentalRank = process.env.GHAS_EXPERIMENTAL_RANK;
  const experimental_rank_enabled = !(
    experimentalRank === "0" ||
    experimentalRank === "false" ||
    experimentalRank === "off"
  );
  return {
    ok: true,
    service: "github-advanced-search-mcp",
    repo: "toxicwind/github-advanced-search-mcp",
    version: "0.6.2",
    github_authenticated: ghAuth || !!resolved.token,
    github_user: ghUser,
    github_token_source: resolved.source,
    // Dual-engine: Blackbird (path:** / UI index) vs REST (filename: kept as-is)
    ghas_code_engine: codeEngine,
    blackbird_session: blackbird,
    blackbird_session_source: webSession?.source ?? "none",
    experimental_rank_enabled,
    experimental_rank_env: experimentalRank ?? "default-on",
    ranker: "packages/github-client/src/ranking (W1 RELEVANCE-FIRST Bun)",
    dual_engine: {
      rest: "filename: and classic /search/code (never rewrite to path:)",
      blackbird: "path:** / path:/…/ / content: / symbol: when session present",
      auto_route_example_path_glob: needsBlackbirdEngine("path:**/.zshrc"),
      auto_route_example_filename: needsBlackbirdEngine("filename:.zshrc"),
    },
    tool_count: TOOL_BY_NAME.size,
    tools: [...TOOL_BY_NAME.keys()].sort(),
  };
}

export async function dispatchTool(name: string, args: Record<string, unknown>) {
  const def = TOOL_BY_NAME.get(name);
  if (!def) throw new Error(`Unknown tool: ${name}`);

  const perPage = Math.min(Number(args.per_page ?? 20), 100);
  const strict = args.strict === true;

  if (name === "ghas_health") {
    return await ghasHealth();
  }

  if (name === "ghas_compare_search" || name === "github_compare") {
    return await performCompare(resolveQuery(args), perPage);
  }

  if (name === "ghas_get_repository" || name === "github_get_repository") {
    const data = await getRepository(String(args.owner), String(args.repo));
    return { ok: !!data, data };
  }

  if (name === "ghas_get_file_contents" || name === "github_get_file_contents") {
    const data = await getFileContents(
      String(args.owner),
      String(args.repo),
      String(args.path),
      args.ref ? String(args.ref) : undefined,
    );
    return { ok: !!data, data };
  }

  if (name === "ghas_query_issues" || name === "github_search_issues") {
    const items = await searchIssues(
      resolveQuery(args),
      perPage,
      (args.state as "open" | "closed" | "all") ?? "all",
    );
    return { query: resolveQuery(args), count: items.length, items };
  }

  if (name === "ghas_list_repo_issues" || name === "github_list_issues") {
    const items = await listRepositoryIssues(
      String(args.owner),
      String(args.repo),
      (args.state as "open" | "closed" | "all") ?? "open",
      perPage,
      args.labels ? String(args.labels) : undefined,
    );
    return { repository: `${args.owner}/${args.repo}`, count: items.length, items };
  }

  if (name === "ghas_simple_search" || name === "estate-scripts_simple_search") {
    const payload = await performSearch(String(args.query), Math.min(perPage, 5), ["unified"], false, false);
    return {
      query: payload.query,
      results: (payload.results || []).slice(0, 5),
      count: payload.count || 0,
    };
  }

  if (name === "ghas_engine_info") {
    return await ghasHealth();
  }

  if (name === "ghas_rank_debug") {
    const payload = await performSearch(
      String(args.query),
      Math.min(perPage, 30),
      ["code"],
      false,
      strict,
    );
    const results = (payload.results || []).slice(0, Math.min(perPage, 20)).map((r: any, i: number) => ({
      rank: i + 1,
      repository: r.repository,
      path: r.path,
      title: r.title,
      score: r.score,
      latentScore: r.latentScore,
      language: r.language,
      stars: r.stars,
      category: r.category,
    }));
    const health = await ghasHealth();
    return {
      query: args.query,
      results,
      count: results.length,
      engine: {
        ghas_code_engine: health.ghas_code_engine,
        blackbird_session: health.blackbird_session,
        experimental_rank_enabled: health.experimental_rank_enabled,
        ranker: health.ranker,
      },
      telemetry: payload.telemetry,
    };
  }

  if (name === "github_search") {
    const cats = (args.categories as SearchCategory[] | undefined) ?? ["unified"];
    return await performSearch(String(args.query), perPage, cats, false, strict);
  }

  if (def.category && def.category !== "meta") {
    return await performSearch(String(args.query), perPage, [def.category], false, strict);
  }

  throw new Error(`Unhandled tool: ${name}`);
}