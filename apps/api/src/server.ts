import { existsSync } from "node:fs";
import { searchGithub } from "@ghas/github-client";
import { API_HOST, API_LOG, API_PORT, FRONTEND_LOG, FRONTEND_PORT, MCP_LOG } from "./lib/env";
import { fail, ok } from "./lib/envelope";
import { classifyGithubError } from "./lib/backend-error";
import { runDirectSearch } from "./adapters/github-direct-adapter";
import { runHybridSearch } from "./adapters/hybrid-adapter";
import { runMcpSearch } from "./adapters/mcp-adapter";
import { expandPack, QUERY_PACKS } from "./lib/query-packs";
import { streamFile, tailFile } from "./services/log-service";
import { ensureMcpStarted, mcpStatus, restartMcp } from "./services/mcp-manager";
import { handleMeshRequest } from "/home/toxic/estate/src/lib/ghas-mesh-features.ts";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function parseSearch(url: URL) {
  return {
    query: url.searchParams.get("query") ?? url.searchParams.get("q") ?? "",
    categories: (url.searchParams.get("categories") ?? "unified").split(",").filter(Boolean) as any,
    per_page: Number(url.searchParams.get("per_page") ?? "20"),
    smart: url.searchParams.get("smart") !== "false",
    cluster: url.searchParams.get("cluster") === "true",
    raw: url.searchParams.get("raw") === "true",
    strict: url.searchParams.get("strict") === "true",
    experimental: url.searchParams.get("experimental") === "true",
  };
}

async function frontendHealthy() {
  try {
    const response = await fetch(`http://127.0.0.1:${FRONTEND_PORT}`, {
      method: "HEAD",
    });
    return response.ok;
  } catch {
    return false;
  }
}

const server = Bun.serve({
  hostname: API_HOST,
  port: API_PORT,
  idleTimeout: 30,
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    const start = performance.now();
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/mesh")) {
        const m = await handleMeshRequest(request, {
          service: "ghas-api",
          version: "ghas-api-1",
        });
        if (m) return m;
      }
      if (url.pathname === "/health" || url.pathname === "/api/health") {
        return json(200, ok("api", {
          status: "ok",
          runtime: "bun",
          api_port: API_PORT,
          frontend_port: FRONTEND_PORT,
        }, "api", 0));
      }

      if (url.pathname === "/api/stack/status") {
        const mcp = await mcpStatus();
        const frontendOk = await frontendHealthy();
        return json(200, ok("api", {
          api: { name: "api", healthy: true, detail: `${API_HOST}:${API_PORT}` },
          mcp: { name: "mcp", healthy: mcp.running, detail: `${mcp.host}:${mcp.port}`, pid: mcp.pid },
          frontend: {
            name: "frontend",
            healthy: frontendOk,
            detail: `http://127.0.0.1:${FRONTEND_PORT}`,
          },
        }, "api", Math.round(performance.now() - start), mcp.running ? undefined : {
          level: "backend_down",
          reason: "ghas mcp child process not running",
          backend_failed: "mcp_tool",
          backend_used: "api",
        }));
      }

      if (url.pathname === "/api/search") {
        const requestShape = parseSearch(url);
        if (!requestShape.query.trim()) return json(400, fail("missing_query", "Query required"));
        const backend = (url.searchParams.get("backend") ?? "hybrid").toLowerCase();
        if (backend === "api") {
          try {
            const direct = await runDirectSearch(requestShape, start);
            return json(200, ok("api", direct.data, "direct_github", Math.round(performance.now() - start), undefined, direct.telemetry));
          } catch (err) {
            const be = classifyGithubError(err);
            const fallback = await runMcpSearch(requestShape);
            return json(200, ok("hybrid", fallback, "mcp_tool", Math.round(performance.now() - start), {
              level: be.level,
              reason: be.message,
              backend_failed: "github_api",
              backend_used: "mcp_tool",
            }, (fallback as any)?.telemetry ?? {}));
          }
        }
        if (backend === "mcp") {
          try {
            const data = await runMcpSearch(requestShape);
            return json(200, ok("mcp", data, "mcp_tool", Math.round(performance.now() - start), undefined, (data as any)?.telemetry ?? {}));
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const fallback = await runDirectSearch(requestShape, start);
            return json(200, ok("hybrid", fallback.data, "direct_github", Math.round(performance.now() - start), {
              level: "backend_down",
              reason: `mcp backend failed: ${msg.slice(0, 160)}`,
              backend_failed: "mcp_tool",
              backend_used: "direct_github",
            }, fallback.telemetry));
          }
        }
        const data = await runHybridSearch(requestShape, start);
        return json(200, ok(data.source, data.data, data.source === "hybrid" ? "mcp_tool" : "direct_github", Math.round(performance.now() - start), data.degradation, data.telemetry ?? {}));
      }

      if (url.pathname === "/api/search/expand" && request.method === "POST") {
        const body = await request.json().catch(() => ({} as Record<string, unknown>));
        const pack = String(body?.pack ?? "").trim();
        const seed = String(body?.seed ?? "").trim();
        if (!pack) return json(400, fail("missing_pack", "pack is required"));
        if (!QUERY_PACKS[pack]) return json(404, fail("unknown_pack", `unknown pack: ${pack}`));
        const expanded = expandPack(pack, seed);
        return json(200, ok("api", { pack, seed, queries: expanded }, "api", Math.round(performance.now() - start)));
      }

      if (url.pathname === "/api/compare") {
        const query = url.searchParams.get("query") ?? "";
        const perPage = Number(url.searchParams.get("per_page") ?? "20");
        if (!query.trim()) return json(400, fail("missing_query", "Query required"));
        const [optimised, raw] = await Promise.all([
          searchGithub({ query, categories: ["unified"] as any, perPage, raw: false }),
          searchGithub({ query, categories: ["unified"] as any, perPage, raw: true }),
        ]);
        return json(200, ok("api", {
          query,
          optimised,
          raw,
          meta: {
            optimised_count: optimised.length,
            raw_count: raw.length,
            time_ms: Math.round(performance.now() - start),
          },
        }, "direct_github", Math.round(performance.now() - start)));
      }

      if (url.pathname === "/api/mcp/status") {
        return json(200, ok("api", await mcpStatus(), "api", Math.round(performance.now() - start)));
      }

      if (url.pathname === "/api/mcp/restart" && request.method === "POST") {
        const running = await restartMcp();
        return json(200, ok("api", { restarted: running }, "api", Math.round(performance.now() - start), running ? undefined : {
          level: "backend_down",
          reason: "mcp restart requested but child process did not come up",
          backend_failed: "mcp_tool",
          backend_used: "api",
        }));
      }

      if (url.pathname === "/api/mcp/query" && request.method === "POST") {
        const body = await request.json();
        if (!body?.query?.trim()) return json(400, fail("missing_query", "Query required"));
        const data = await runMcpSearch({
          query: body.query,
          categories: body.categories ?? ["unified"],
          per_page: body.per_page ?? 20,
          smart: true,
          strict: body.strict === true,
        });
        return json(200, ok("mcp", data, "mcp_tool", Math.round(performance.now() - start), undefined, (data as any)?.telemetry ?? {}));
      }

      if (url.pathname === "/api/logs/api") return json(200, ok("api", { service: "api", log: tailFile(API_LOG, 200) }, "api", Math.round(performance.now() - start)));
      if (url.pathname === "/api/logs/mcp") return json(200, ok("api", { service: "mcp", log: tailFile(MCP_LOG, 200) }, "api", Math.round(performance.now() - start)));
      if (url.pathname === "/api/logs/frontend") return json(200, ok("api", { service: "frontend", log: tailFile(FRONTEND_LOG, 200) }, "api", Math.round(performance.now() - start)));

      if (url.pathname === "/api/logs/frontend/stream") {
        return new Response(streamFile(FRONTEND_LOG), {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
            ...CORS_HEADERS,
          },
        });
      }
      if (url.pathname === "/api/logs/mcp/stream") {
        return new Response(streamFile(MCP_LOG), {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
            ...CORS_HEADERS,
          },
        });
      }

      return json(404, fail("not_found", `No route for ${url.pathname}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return json(500, fail("internal_error", message, Math.round(performance.now() - start)));
    }
  },
});

await ensureMcpStarted();
console.log(JSON.stringify({ level: "info", message: "bun api ready", host: API_HOST, port: API_PORT, url: server.url.toString() }));

// hotreload-probe 1784356799445
