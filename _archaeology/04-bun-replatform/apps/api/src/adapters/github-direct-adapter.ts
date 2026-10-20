import type { SearchRequest } from "@ghas/contracts";
import { searchGithub } from "@ghas/github-client";
import { buildClusters, buildResponse } from "@ghas/search-core";

export async function runDirectSearch(request: SearchRequest, latencyStart: number) {
  const results = await searchGithub({
    query: request.query,
    categories: request.categories ?? ["unified"],
    perPage: request.per_page ?? 20,
    raw: request.raw,
  });
  const latencyMs = Math.round(performance.now() - latencyStart);
  if (request.cluster) return buildClusters(results);
  return buildResponse(request, results, latencyMs);
}
