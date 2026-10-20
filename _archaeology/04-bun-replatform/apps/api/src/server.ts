import { existsSync } from "node:fs";
import { searchGithub } from "@ghas/github-client";
import { API_HOST, API_LOG, API_PORT, FRONTEND_LOG, FRONTEND_PORT, MCP_LOG } from "./lib/env";
import { fail, ok } from "./lib/envelope";
import { runDirectSearch } from "./adapters/github-direct-adapter";
import { runHybridSearch } from "./adapters/hybrid-adapter";
import { runMcpSearch } from "./adapters/mcp-adapter";
import { streamFile, tailFile } from "./services/log-service";
import { ensureMcpStarted, mcpStatus, restartMcp } from "./services/mcp-manager";

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
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    const start = performance.now();
    const url = new URL(request.url);
    try {
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
        }, "api", Math.round(performance.now() - start), !mcp.running));
      }

      if (url.pathname === "/api/search") {
        const requestShape = parseSearch(url);
        if (!requestShape.query.trim()) return json(400, fail("missing_query", "Query required"));
        const backend = (url.searchParams.get("backend") ?? "hybrid").toLowerCase();
        if (backend === "api") {
          const data = await runDirectSearch(requestShape, start);
          return json(200, ok("api", data, "direct_github", Math.round(performance.now() - start)));
        }
        if (backend === "mcp") {
          const data = await runMcpSearch(requestShape);
          return json(200, ok("mcp", data, "mcp_tool", Math.round(performance.now() - start)));
        }
        const data = await runHybridSearch(requestShape, start);
        return json(200, ok(data.source, data.data, data.source === "hybrid" ? "mcp_tool" : "direct_github", Math.round(performance.now() - start), data.degraded));
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
        return json(200, ok("api", { restarted: running }, "api", Math.round(performance.now() - start), !running));
      }

      if (url.pathname === "/api/mcp/query" && request.method === "POST") {
        const body = await request.json();
        if (!body?.query?.trim()) return json(400, fail("missing_query", "Query required"));
        const data = await runMcpSearch({
          query: body.query,
          categories: body.categories ?? ["unified"],
          per_page: body.per_page ?? 20,
          smart: true,
        });
        return json(200, ok("mcp", data, "mcp_tool", Math.round(performance.now() - start)));
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
