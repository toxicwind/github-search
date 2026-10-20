import type { Degradation, SearchRequest } from "@ghas/contracts";
import { runDirectSearch } from "./github-direct-adapter";
import { runMcpSearch } from "./mcp-adapter";
import { classifyGithubError } from "../lib/backend-error";

// API is the primary backend (replaces real GitHub search); MCP/browser is the
// fallback for when the key is missing, authed-out, or rate limited.
export async function runHybridSearch(request: SearchRequest, latencyStart: number) {
  try {
    const direct = await runDirectSearch(request, latencyStart);
    return {
      source: "api" as const,
      degradation: undefined as Degradation | undefined,
      data: direct.data,
      telemetry: direct.telemetry,
    };
  } catch (err) {
    const be = classifyGithubError(err);
    const mcp = await runMcpSearch(request);
    return {
      source: "hybrid" as const,
      degradation: {
        level: be.level,
        reason: be.message,
        backend_failed: "github_api",
        backend_used: "mcp_tool",
      } satisfies Degradation,
      data: mcp,
      telemetry: (mcp as any)?.telemetry ?? null,
    };
  }
}
