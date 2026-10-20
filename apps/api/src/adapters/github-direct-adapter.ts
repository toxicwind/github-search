import type { SearchRequest } from "@ghas/contracts";
import { searchGithubDetailed } from "@ghas/github-client";
import { buildClusters, buildResponse } from "@ghas/search-core";
import { classifyGithubError } from "../lib/backend-error";

export async function runDirectSearch(request: SearchRequest, latencyStart: number) {
  let detailed: Awaited<ReturnType<typeof searchGithubDetailed>>;
  try {
    detailed = await searchGithubDetailed({
      query: request.query,
      categories: request.categories ?? ["unified"],
      perPage: request.per_page ?? 20,
      raw: request.raw,
      strict: request.strict === true,
    });
  } catch (err) {
    throw classifyGithubError(err);
  }
  const latencyMs = Math.round(performance.now() - latencyStart);
  if (request.cluster) {
    return {
      data: buildClusters(detailed.results),
      telemetry: detailed.telemetry,
    };
  }
  return {
    data: buildResponse(request, detailed.results, latencyMs),
    telemetry: detailed.telemetry,
  };
}
