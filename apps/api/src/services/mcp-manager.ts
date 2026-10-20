import { MCP_ENTRY, MCP_HOST, MCP_LOG, MCP_PORT, ROOT, ensureDir, readHomeEnv } from "../lib/env";

const state: { child: Bun.Subprocess | null } = { child: null };

async function httpProbe() {
  try {
    const response = await fetch(`http://${MCP_HOST}:${MCP_PORT}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function ensureMcpStarted() {
  if (await httpProbe()) return true;
  if (state.child && state.child.exitCode === null) return true;
  ensureDir(MCP_LOG);
  state.child = Bun.spawn(["bun", "run", MCP_ENTRY, "--mode", "http"], {
    cwd: ROOT,
    env: readHomeEnv(),
    stdout: "ignore",
    stderr: "ignore",
  });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await httpProbe()) return true;
    await Bun.sleep(250);
  }
  return false;
}

export async function restartMcp() {
  if (state.child && state.child.exitCode === null) {
    state.child.kill();
    await state.child.exited.catch(() => null);
    state.child = null;
  }
  return ensureMcpStarted();
}

export async function mcpStatus() {
  return {
    running: await httpProbe(),
    pid: state.child?.pid ?? null,
    host: MCP_HOST,
    port: MCP_PORT,
    log: MCP_LOG,
  };
}

export async function mcpSearch(query: string, perPage = 20, categories?: string[], strict = false) {
  const ready = await ensureMcpStarted();
  if (!ready) throw new Error("MCP sidecar unavailable");
  const response = await fetch(`http://${MCP_HOST}:${MCP_PORT}/api/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, per_page: perPage, categories, strict }),
  });
  if (!response.ok) throw new Error(`MCP search failed: ${response.status}`);
  return response.json();
}
