import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const ROOT = resolve(import.meta.dir, "..", "..", "..");
export const LOG_DIR = resolve(ROOT, "infra");
export const API_HOST = process.env.GHAS_API_HOST ?? "127.0.0.1";
export const API_PORT = Number(process.env.GHAS_API_PORT ?? "35161");
export const MCP_HOST = process.env.GHAS_MCP_HOST ?? "127.0.0.1";
export const MCP_PORT = Number(process.env.GHAS_MCP_PORT ?? "35162");
export const FRONTEND_PORT = Number(process.env.GHAS_FRONTEND_PORT ?? "35160");
export const API_LOG = resolve(LOG_DIR, "api.log");
export const MCP_LOG = resolve(LOG_DIR, "mcp.log");
export const FRONTEND_LOG = resolve(LOG_DIR, "frontend.log");
export const MCP_ENTRY = resolve(ROOT, "apps/mcp/src/server.ts");

export function ensureDir(file: string) {
  mkdirSync(dirname(file), { recursive: true });
}

export function readHomeEnv() {
  const env = { ...process.env } as Record<string, string>;
  const file = resolve(process.env.HOME ?? "/home/toxic", ".env");
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    if (!env[key]) env[key] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}
