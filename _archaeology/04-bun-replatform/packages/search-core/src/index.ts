import type {
  Cluster,
  ClusteredResults,
  SearchRequest,
  SearchResponseV2,
  SearchResult,
} from "@ghas/contracts";

function groupBy(results: SearchResult[], key: (result: SearchResult) => string | undefined): Cluster[] {
  const groups = new Map<string, SearchResult[]>();
  for (const result of results) {
    const name = key(result) || "unknown";
    const next = groups.get(name) ?? [];
    next.push(result);
    groups.set(name, next);
  }
  return [...groups.entries()]
    .map(([name, items]) => ({
      name,
      count: items.length,
      score_sum: items.reduce((sum, item) => sum + item.score, 0),
      items,
    }))
    .sort((a, b) => b.score_sum - a.score_sum);
}

export function buildClusters(results: SearchResult[]): ClusteredResults {
  const by_language = groupBy(results, (result) => result.language);
  const by_category = groupBy(results, (result) => result.category);
  const by_repo = groupBy(results, (result) => result.repository);
  return {
    by_language,
    by_category,
    by_repo,
    clusters: [...by_category, ...by_language, ...by_repo].slice(0, 18),
  };
}

export function inferIntent(request: SearchRequest) {
  const query = request.query.toLowerCase();
  if (query.includes("mcp") || query.includes("agent")) {
    return { label: "agent-integration", confidence: 0.84 };
  }
  if (query.includes("/") || query.includes("class ") || query.includes("function ")) {
    return { label: "structural-code-search", confidence: 0.79 };
  }
  return { label: "discovery", confidence: 0.61 };
}

export function buildResponse(request: SearchRequest, results: SearchResult[], latencyMs: number): SearchResponseV2 {
  const donors = results.filter((result) => result.isEmergent).slice(0, 6);
  return {
    query: request.query,
    results,
    donors,
    intent: inferIntent(request),
    metrics: {
      latency_ms: latencyMs,
      strategies: [
        "direct_github",
        request.smart === false ? "raw_ranking" : "adaptive_ranking",
        request.experimental ? "experimental" : "stable",
      ],
    },
  };
}
