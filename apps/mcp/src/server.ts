import {
  getRepository,
  getFileContents,
  searchIssues,
  listRepositoryIssues,
} from "@ghas/github-client";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { GHAS_TOOLS } from "./tools";
import { dispatchTool, performCompare, performSearch } from "./handlers";
import { GhasStreamableHttpTransport } from "./gas-transport.js";

// Ports only from env (estate-scripts/config/ports.env via stack or export)
function requirePort(name: string): number {
  const v = process.env[name];
  if (!v) throw new Error(`${name} required (estate-scripts/config/ports.env)`);
  return Number(v);
}
const modeArg = Bun.argv.includes("--mode") ? Bun.argv[Bun.argv.indexOf("--mode") + 1] : "http";
const host = process.env.GHAS_MCP_HOST ?? "127.0.0.1";
const port = modeArg === "http" ? requirePort("GHAS_MCP_PORT") : 0;

// ── MCP server instance (same handlers as startStdio) ──────────────────────
function createMcpServer() {
  const server = new Server(
    { name: "github-advanced-search-mcp", version: "0.6.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: GHAS_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    const payload = await dispatchTool(name, args);
    return { content: [{ type: "text", text: JSON.stringify(payload) }] };
  });

  return server;
}

async function startMcpHttp() {
  // Lazy mesh (estate-scripts lib) — optional if path missing
  let handleMesh: ((req: Request, ctx: any) => Promise<Response | null>) | null = null;
  try {
    const mod = await import("/home/toxic/estate/src/lib/ghas-mesh-features.ts");
    handleMesh = mod.handleMeshRequest;
  } catch (e) {
    console.warn("mesh features unavailable", e);
  }

  const mcpServer = createMcpServer();

  // Custom streaming transport — fixes the upstream WebStandard transport's
  // 406-on-initialize bug (mcpproxy sends Accept: application/json).
  // See apps/mcp/src/gas-transport.ts for the full spec implementation.
  const mcpTransport = new GhasStreamableHttpTransport(mcpServer);

  await mcpServer.connect(mcpTransport as any);

  Bun.serve({
    hostname: host,
    port,
    idleTimeout: 120,
    async fetch(request) {
      const url = new URL(request.url);

      // Mesh features (estate-scripts lib)
      if (url.pathname.startsWith("/mesh") && handleMesh) {
        const m = await handleMesh(request, {
          service: "ghas-mcp",
          version: "ghas-mcp-0.6",
        });
        if (m) return m;
      }

      // MCP protocol endpoint — handled by the custom streaming transport
      if (url.pathname === "/mcp") {
        try {
          return await mcpTransport.handleRequest(request);
        } catch (err) {
          console.error("mcp transport error", err);
          return new Response(JSON.stringify({ error: "internal error" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      }

      // REST API endpoints (legacy / health)
      if (url.pathname === "/health") {
        const body = await dispatchTool("ghas_health", {});
        return Response.json(body);
      }
      if (url.pathname === "/api/search" && request.method === "POST") {
        const body = (await request.json()) as Record<string, unknown>;
        return Response.json(
          await performSearch(
            String(body.query),
            Number(body.per_page ?? 20),
            (body.categories as any) ?? ["unified"],
            Boolean(body.raw),
            body.strict === true,
          ),
        );
      }
      if (url.pathname === "/api/compare" && request.method === "POST") {
        const body = (await request.json()) as Record<string, unknown>;
        return Response.json(await performCompare(String(body.query), Number(body.per_page ?? 20)));
      }
      if (url.pathname === "/api/repo" && request.method === "POST") {
        const body = (await request.json()) as { owner: string; repo: string };
        const data = await getRepository(body.owner, body.repo);
        return Response.json({ ok: !!data, data });
      }
      if (url.pathname === "/api/file" && request.method === "POST") {
        const body = (await request.json()) as { owner: string; repo: string; path: string; ref?: string };
        const data = await getFileContents(body.owner, body.repo, body.path, body.ref);
        return Response.json({ ok: !!data, data });
      }
      if (url.pathname === "/api/issues/search" && request.method === "POST") {
        const body = (await request.json()) as { query: string; per_page?: number; state?: string };
        const items = await searchIssues(body.query, body.per_page ?? 20, (body.state as any) ?? "all");
        return Response.json({ count: items.length, items });
      }
      if (url.pathname === "/api/issues/list" && request.method === "POST") {
        const body = (await request.json()) as {
          owner: string;
          repo: string;
          state?: string;
          per_page?: number;
          labels?: string;
        };
        const items = await listRepositoryIssues(
          body.owner,
          body.repo,
          (body.state as any) ?? "open",
          body.per_page ?? 20,
          body.labels,
        );
        return Response.json({ count: items.length, items });
      }

      // Root: discovery payload
      if (url.pathname === "/") {
        return Response.json({
          service: "github-advanced-search-mcp",
          version: "0.6.0",
          protocols: ["MCP Streamable HTTP", "REST"],
          endpoints: {
            mcp: "/mcp (POST/GET/DELETE — MCP protocol)",
            health: "/health",
            api: "/api/search, /api/compare, /api/repo, /api/file, /api/issues/search, /api/issues/list",
          },
        });
      }

      return new Response("not found", { status: 404 });
    },
  });
  console.log(JSON.stringify({
    level: "info",
    message: "ghas mcp http ready (GhasStreamableHttpTransport)",
    host,
    port,
    repo: "toxicwind/github-advanced-search-mcp",
    streaming: "SSE-v2-GH2F-25113",
  }));
}

async function startStdio() {
  const server = createMcpServer();
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (modeArg === "stdio") {
  await startStdio();
} else {
  await startMcpHttp();
}
// hotreload-probe 1784356801654
