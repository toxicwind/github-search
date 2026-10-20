import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const API_PORT = Number(process.env.GHAS_API_PORT || 35161);
const API_HOST = process.env.GHAS_API_HOST || "127.0.0.1";
const MCP_PORT = Number(process.env.GHAS_MCP_PORT || 35162);
const MCP_HOST = process.env.GHAS_MCP_HOST || "127.0.0.1";
const WEB_PORT = Number(process.env.GHAS_FRONTEND_PORT || 35160);
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
const API_URL = `http://${API_HOST}:${API_PORT}`;
const BUN_BIN = process.env.BUN_BIN || path.join(process.env.HOME || "", ".bun/bin/bun");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startProcess(command, args, extraEnv = {}) {
  return spawn(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

function getLanIps() {
  const net = os.networkInterfaces();
  const ips = [];
  for (const values of Object.values(net)) {
    for (const addr of values || []) {
      if (addr.family === "IPv4" && !addr.internal) ips.push(addr.address);
    }
  }
  return ips;
}

async function main() {
  let mcpProcess = null;
  let apiProcess = null;
  let webProcess = null;

  try {
    await waitForServer(`http://${MCP_HOST}:${MCP_PORT}/health`, 1200);
    console.log(`[dev-headed] reusing mcp at http://${MCP_HOST}:${MCP_PORT}`);
  } catch {
    mcpProcess = startProcess(BUN_BIN, ["--watch", "apps/mcp/src/server.ts", "--mode", "http"], {
      GHAS_MCP_HOST: MCP_HOST,
      GHAS_MCP_PORT: String(MCP_PORT),
    });
    mcpProcess.on("exit", (code) => {
      console.log(`\n[dev-headed] mcp process exited (${code ?? "null"})`);
      process.exit(code ?? 0);
    });
    await waitForServer(`http://${MCP_HOST}:${MCP_PORT}/health`);
  }

  try {
    await waitForServer(`${API_URL}/api/health`, 1200);
    console.log(`[dev-headed] reusing api at ${API_URL}`);
  } catch {
    apiProcess = startProcess(BUN_BIN, ["--watch", "apps/api/src/server.ts"], {
      GHAS_API_HOST: API_HOST,
      GHAS_API_PORT: String(API_PORT),
      GHAS_MCP_HOST: MCP_HOST,
      GHAS_MCP_PORT: String(MCP_PORT),
      GHAS_FRONTEND_PORT: String(WEB_PORT),
    });
    apiProcess.on("exit", (code) => {
      console.log(`\n[dev-headed] api process exited (${code ?? "null"})`);
      process.exit(code ?? 0);
    });
    await waitForServer(`${API_URL}/api/health`);
  }

  try {
    await waitForServer(WEB_URL, 1200);
    console.log(`[dev-headed] reusing frontend at ${WEB_URL}`);
  } catch {
    webProcess = startProcess(BUN_BIN, ["run", "dev:frontend"], {
      NEXT_PUBLIC_API_URL: API_URL,
    });
    webProcess.on("exit", (code) => {
      console.log(`\n[dev-headed] frontend process exited (${code ?? "null"})`);
      process.exit(code ?? 0);
    });
    await waitForServer(WEB_URL);
  }

  // estate-scripts Firefox live control integration (added during complete install of this repo)
  // Supports the original request: drive the user's real logged-in Firefox (with GitHub cookies etc.)
  // via Playwright remote + profile takeover, or zero-restart ydotool fallback.
  const browserMode = (process.env.GHAS_BROWSER || process.env.BROWSER || "chromium").toLowerCase();

  if (browserMode === "firefox" || browserMode === "ff") {
    console.log("[dev-headed] Firefox live mode requested — launching controllable profile (the real one you use)");
    // This calls the estate-scripts-browser scripts we installed as part of "complete github-advanced-search-mcp install"
    const { spawnSync } = await import("node:child_process");
    const launcher = path.join(ROOT, "scripts/estate-scripts-browser/launch-firefox-from-profile.sh");
    spawnSync("bash", [launcher], { stdio: "inherit", cwd: ROOT });
    console.log("[dev-headed] Firefox profile launcher started (or reused). Use its ws:// endpoint with the playwright MCP for full browser_* tools.");
    console.log("[dev-headed] You can now point estate-scripts-playwright-fork or this MCP's browser flows at your live Firefox.");
  } else {
    // Default / original Chromium headed dev browser
    const browser = await chromium.launch({ headless: false, args: ["--window-size=1720,1080"] });
    const context = await browser.newContext({ viewport: { width: 1600, height: 980 } });
    const page = await context.newPage();
    await page.goto(WEB_URL, { waitUntil: "domcontentloaded" });
    console.log("[dev-headed] Chromium headed dev browser opened to the UI.");
  }

  console.log(`[dev-headed] mcp running at http://${MCP_HOST}:${MCP_PORT}`);
  console.log(`[dev-headed] api running at ${API_URL}`);
  console.log(`[dev-headed] web hmr running at ${WEB_URL}`);
  const ips = getLanIps();
  if (ips.length > 0) {
    console.log(`[dev-headed] LAN URLs: ${ips.map((ip) => `http://${ip}:${WEB_PORT}`).join("  ")}`);
  }
  console.log("[dev-headed] Browser remains open. Next dev handles live reload.");

  const cleanup = async () => {
    try {
      await context.close();
    } catch {}
    try {
      await browser.close();
    } catch {}
    if (webProcess && !webProcess.killed) webProcess.kill("SIGINT");
    if (apiProcess && !apiProcess.killed) apiProcess.kill("SIGINT");
    if (mcpProcess && !mcpProcess.killed) mcpProcess.kill("SIGINT");
  };

  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await cleanup();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
