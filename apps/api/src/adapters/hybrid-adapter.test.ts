import { afterEach, describe, expect, mock, test } from "bun:test";
import type { SearchRequest } from "@ghas/contracts";

const calls: string[] = [];

const directOk = mock(async (_request: SearchRequest, _latencyStart: number) => {
  calls.push("direct");
  return { data: { query: "q", results: [{ id: 1 }] }, telemetry: { strategies: ["api"] } };
});
const directFail = mock(async (_request: SearchRequest, _latencyStart: number) => {
  calls.push("direct");
  throw new Error("GitHub 403: API rate limit exceeded");
});
const mcpOk = mock(async (_request: SearchRequest) => {
  calls.push("mcp");
  return { query: "q", results: [{ id: 2 }], telemetry: { strategies: ["mcp"] } };
});

const request: SearchRequest = { query: "q", per_page: 3 };

async function loadHybrid(direct: typeof directOk) {
  calls.length = 0;
  mock.module("./github-direct-adapter", () => ({ runDirectSearch: direct }));
  mock.module("./mcp-adapter", () => ({ runMcpSearch: mcpOk }));
  // cache-bust so the mocked modules are picked up per scenario
  return import(`./hybrid-adapter.ts?case=${Date.now()}-${Math.random()}`);
}

afterEach(() => {
  mock.restore();
});

describe("runHybridSearch (API-first)", () => {
  test("direct API succeeds: MCP is never called, source is api, no degradation", async () => {
    const { runHybridSearch } = await loadHybrid(directOk);
    const out = await runHybridSearch(request, performance.now());
    expect(calls).toEqual(["direct"]);
    expect(directOk).toHaveBeenCalledTimes(1);
    expect(mcpOk).not.toHaveBeenCalled();
    expect(out.source).toBe("api");
    expect(out.degradation).toBeUndefined();
    expect(out.data).toEqual({ query: "q", results: [{ id: 1 }] });
  });

  test("direct API fails: falls back to MCP with leveled degradation", async () => {
    const { runHybridSearch } = await loadHybrid(directFail);
    const out = await runHybridSearch(request, performance.now());
    // API tried first, MCP second
    expect(calls).toEqual(["direct", "mcp"]);
    expect(out.source).toBe("hybrid");
    expect(out.data).toEqual({ query: "q", results: [{ id: 2 }], telemetry: { strategies: ["mcp"] } });
    expect(out.degradation).toEqual({
      level: "rate_limit",
      reason: "github api rate limited (HTTP 403)",
      backend_failed: "github_api",
      backend_used: "mcp_tool",
    });
  });

  test("auth failure (401) also falls back with auth level", async () => {
    const direct401 = mock(async () => {
      calls.push("direct");
      throw new Error("GitHub 401: Bad credentials");
    });
    const { runHybridSearch } = await loadHybrid(direct401);
    const out = await runHybridSearch(request, performance.now());
    expect(calls).toEqual(["direct", "mcp"]);
    expect(out.source).toBe("hybrid");
    expect(out.degradation?.level).toBe("auth");
    expect(out.degradation?.backend_failed).toBe("github_api");
    expect(out.degradation?.backend_used).toBe("mcp_tool");
  });
});
