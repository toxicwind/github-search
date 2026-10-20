import process from "node:process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const API = process.env.GHAS_API_URL || "http://127.0.0.1:35161";
const MCP_ENTRY =
  process.env.GHAS_MCP_ENTRY ||
  "/home/toxic/apex-workspace/apex-labs/repos/github/toxicwind/github-advanced-search-mcp/apps/mcp/src/server.ts";
const BUN_BIN = process.env.BUN_BIN || "/home/toxic/.bun/bin/bun";
const queries = [
  "playwright mcp",
  "tmux mcp server",
  "playwright rebrowser active profile attach",
  "rebrowser playwright mcp",
  "github advanced search mcp",
];

async function fetchJson(url) {
  const res = await fetch(url);
  const payload = await res.json();
  if (!res.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message || `HTTP ${res.status}`);
  }
  return payload;
}

async function safe(label, task) {
  try {
    return { ok: true, value: await task() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      label,
    };
  }
}

async function runMcpClient() {
  const transport = new StdioClientTransport({
    command: BUN_BIN,
    args: ["run", MCP_ENTRY, "--mode", "stdio"],
    env: {
      ...process.env,
    },
  });
  const client = new Client(
    { name: "ghas-benchmark", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
  return client;
}

function repos(payload) {
  return (payload?.data?.results || payload?.results || [])
    .map((item) => item.repository)
    .filter(Boolean);
}

const client = await runMcpClient();

for (const query of queries) {
  const [api, hybrid, mcpHttp, mcpTool] = await Promise.all([
    safe("api", () =>
      fetchJson(
        `${API}/api/search?query=${encodeURIComponent(query)}&categories=unified&per_page=5&backend=api`,
      ),
    ),
    safe("hybrid", () =>
      fetchJson(
        `${API}/api/search?query=${encodeURIComponent(query)}&categories=unified&per_page=5&backend=hybrid`,
      ),
    ),
    safe("mcp_http", () =>
      fetchJson(
        `${API}/api/search?query=${encodeURIComponent(query)}&categories=unified&per_page=5&backend=mcp`,
      ),
    ),
    safe("mcp_stdio", () =>
      client.callTool({
        name: "github_search",
        arguments: { query, categories: ["unified"], per_page: 5 },
      }),
    ),
  ]);

  const toolPayload = mcpTool.ok
    ? JSON.parse(mcpTool.value.content?.[0]?.text || "{}")
    : null;
  console.log(
    JSON.stringify({
      query,
      api: api.ok ? repos(api.value) : [],
      hybrid: hybrid.ok ? repos(hybrid.value) : [],
      mcp_http: mcpHttp.ok ? repos(mcpHttp.value) : [],
      mcp_stdio: toolPayload ? repos(toolPayload) : [],
      errors: [api, hybrid, mcpHttp, mcpTool]
        .filter((entry) => !entry.ok)
        .map((entry) => ({ backend: entry.label, error: entry.error })),
    }),
  );
}

await client.close();
