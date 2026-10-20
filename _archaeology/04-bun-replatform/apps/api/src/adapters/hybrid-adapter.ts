import type { SearchRequest } from "@ghas/contracts";
import { runDirectSearch } from "./github-direct-adapter";
import { runMcpSearch } from "./mcp-adapter";

export async function runHybridSearch(request: SearchRequest, latencyStart: number) {
  try {
    return {
      source: "hybrid" as const,
      degraded: false,
      data: await runMcpSearch(request),
    };
  } catch {
    return {
      source: "api" as const,
      degraded: true,
      data: await runDirectSearch(request, latencyStart),
    };
  }
}
