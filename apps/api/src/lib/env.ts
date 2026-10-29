import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";

export const ROOT = resolve(import.meta.dir, "..", "..", "..", "..");
export const LOG_DIR = process.env.GHAS_LOG_DIR
  ? resolve(process.env.GHAS_LOG_DIR)
  : resolve(ROOT, "infra");

/** Load KEY=VAL into process.env if not already set */
function applyEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const eq = line.indexOf("=");
    const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
    const val = line
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}

const home = process.env.HOME ?? homedir();
const sov = process.env["ESTATE_NS_ROOT"] ?? resolve(home, "pens/estate");
applyEnvFile(resolve(sov, "config/ports.env"));
applyEnvFile(resolve(sov, ".env.local"));
applyEnvFile(resolve(home, ".secrets"));

function requirePort(name: string): number {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} required (estate ns config/ports.env (pens/estate, anomaly #10 ns), 25xxx range)`);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${name} invalid: ${v}`);
  return n;
}

export const API_HOST = process.env.GHAS_API_HOST ?? "127.0.0.1";
export const API_PORT = requirePort("GHAS_API_PORT");
export const MCP_HOST = process.env.GHAS_MCP_HOST ?? "127.0.0.1";
export const MCP_PORT = requirePort("GHAS_MCP_PORT");
export const FRONTEND_PORT = requirePort("GHAS_FRONTEND_PORT");

export const API_LOG = process.env.GHAS_API_LOG
  ? resolve(process.env.GHAS_API_LOG)
  : resolve(LOG_DIR, "api.log");
export const MCP_LOG = process.env.GHAS_MCP_LOG
  ? resolve(process.env.GHAS_MCP_LOG)
  : resolve(LOG_DIR, "mcp.log");
export const FRONTEND_LOG = process.env.GHAS_FRONTEND_LOG
  ? resolve(process.env.GHAS_FRONTEND_LOG)
  : resolve(LOG_DIR, "frontend.log");
export const MCP_ENTRY = resolve(ROOT, "apps/mcp/src/server.ts");

export function ensureDir(file: string) {
  mkdirSync(dirname(file), { recursive: true });
}

function loadEnvFile(env: Record<string, string>, file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const eq = line.indexOf("=");
    const key = line.slice(0, eq).trim();
    const val = line
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!env[key]) env[key] = val;
  }
}

export function readHomeEnv() {
  const env = { ...process.env } as Record<string, string>;
  loadEnvFile(env, resolve(home, ".secrets"));
  loadEnvFile(env, resolve(home, ".env"));
  loadEnvFile(env, resolve(sov, "config/ports.env"));
  return env;
}
