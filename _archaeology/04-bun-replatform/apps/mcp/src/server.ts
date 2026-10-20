import { searchGithub } from "@ghas/github-client";
import { buildResponse } from "@ghas/search-core";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const host = process.env.GHAS_MCP_HOST ?? "127.0.0.1";
const port = Number(process.env.GHAS_MCP_PORT ?? "35162");
const modeArg = Bun.argv.includes("--mode") ? Bun.argv[Bun.argv.indexOf("--mode") + 1] : "http";

async function performSearch(query: string, perPage = 20, categories: string[] = ["unified"], raw = false) {
  const start = performance.now();
  const results = await searchGithub({ query, categories: categories as any, perPage, raw });
  return buildResponse({ query, categories: categories as any, per_page: perPage, smart: true }, results, Math.round(performance.now() - start));
}

async function performCompare(query: string, perPage = 20) {
  const start = performance.now();
  const [optimised, raw] = await Promise.all([
    searchGithub({ query, categories: ["unified"] as any, perPage, raw: false }),
    searchGithub({ query, categories: ["unified"] as any, perPage, raw: true }),
  ]);
  return { query, optimised, raw, meta: { optimised_count: optimised.length, raw_count: raw.length, time_ms: Math.round(performance.now() - start) } };
}

async function startHttp() {
  const server = Bun.serve({
    hostname: host,
    port,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/health") return Response.json({ ok: true, service: "ghas-mcp", mode: "http", host, port });
      if (url.pathname === "/api/search" && request.method === "POST") {
        const body = await request.json();
        return Response.json(await performSearch(body.query, body.per_page ?? 20, body.categories ?? ["unified"]));
      }
      if (url.pathname === "/api/compare" && request.method === "POST") {
        const body = await request.json();
        return Response.json(await performCompare(body.query, body.per_page ?? 20));
      }
      return new Response("not found", { status: 404 });
    },
  });
  console.log(JSON.stringify({ level: "info", message: "bun mcp http ready", host, port, url: server.url.toString() }));
}

async function startStdio() {
  const server = new Server({ name: "github-advanced-search-mcp", version: "0.4.0" }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "github_search",
        description: "Search GitHub across repositories, code, issues, pull requests, users, discussions, and commits.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            categories: { type: "array", items: { type: "string" } },
            per_page: { type: "number" }
          },
          required: ["query"]
        }
      },
      {
        name: "github_compare",
        description: "Compare optimized search output with raw GitHub ranking.",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" }, per_page: { type: "number" } },
          required: ["query"]
        }
      }
    ]
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "github_search") {
      const args = request.params.arguments as any;
      const payload = await performSearch(args.query, args.per_page ?? 20, args.categories ?? ["unified"]);
      return { content: [{ type: "text", text: JSON.stringify(payload) }] };
    }
    if (request.params.name === "github_compare") {
      const args = request.params.arguments as any;
      const payload = await performCompare(args.query, args.per_page ?? 20);
      return { content: [{ type: "text", text: JSON.stringify(payload) }] };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (modeArg === "stdio") {
  await startStdio();
} else {
  await startHttp();
}
