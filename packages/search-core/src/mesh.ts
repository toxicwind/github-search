/**
 * GHAS mesh feature registry (20 features) — vendored from estate
 * `src/lib/ghas-mesh-features.ts` + `ports.ts`, integrated per 2026-10-29
 * architect order ("mesh is deprecated to integrate"): no cross-repo imports.
 *
 * Ports: this product is self-contained — GHAS_* env vars win; fallback to the
 * estate SSOT file `pens/estate/config/ports.env` by absolute path (read-only,
 * parse-only, never a ghost import). Borrowed patterns: k8s ready/live/startup,
 * service discovery, dependency graph, version/capabilities.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Port SSOT (vendored, trimmed to what the mesh needs)
// ---------------------------------------------------------------------------

const SOV =
  process.env.ESTATE_ROOT || resolve(homedir(), "pens", "estate");

function stripInlineComment(raw: string): string {
  const v = raw.trim();
  const q = v[0];
  if (q === '"' || q === "'") {
    const end = v.indexOf(q, 1);
    return end > 0 ? v.slice(0, end + 1) : v;
  }
  const hash = v.search(/\s#/);
  return (hash >= 0 ? v.slice(0, hash) : v).trim();
}

function parseEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (let line of readFileSync(file, "utf8").split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7);
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const k = line.slice(0, eq).trim();
    const v = stripInlineComment(line.slice(eq + 1)).replace(/^['"]|['"]$/g, "");
    if (!k || v === "") continue;
    out[k] = v;
  }
  return out;
}

let portsLoaded = false;

function loadPorts(): void {
  if (portsLoaded) return;
  portsLoaded = true;
  const file = resolve(SOV, "config", "ports.env");
  for (const [k, v] of Object.entries(parseEnvFile(file))) {
    // explicit non-placeholder env wins over the file (placeholder = unset/empty/redacted)
    const cur = process.env[k];
    if (cur === undefined || cur === "" || cur === "<redacted>") {
      process.env[k] = v;
    }
  }
}

export function requirePort(name: string): number {
  loadPorts();
  const v = process.env[name];
  if (v === undefined || v === "") {
    throw new Error(`${name} required — set in ${SOV}/config/ports.env (25xxx SSOT)`);
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    throw new Error(`${name} must be a valid TCP port, got ${v}`);
  }
  return n;
}

function urlFor(meta: ServiceMeta, path = ""): string {
  const port = requirePort(meta.portEnv);
  const p = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `http://127.0.0.1:${port}${p}`;
}

// ---------------------------------------------------------------------------
// Mesh catalog + features
// ---------------------------------------------------------------------------

export type MeshServiceId =
  | "bornite"
  | "rust-web"
  | "yote"
  | "rig"
  | "estate-router"
  | "prometheus"
  | "hf-downloader"
  | "null-g-proxy"
  | "grafana"
  | "ghas-api"
  | "ghas-mcp"
  | "mesh-hub"
  | "brand"
  | "bench-radar";

export type FeatureId =
  | "readyz"
  | "livez"
  | "startupz"
  | "healthz"
  | "version"
  | "features"
  | "status"
  | "peers"
  | "deps"
  | "mesh-graph"
  | "chain-health"
  | "discover"
  | "capabilities"
  | "metrics-lite"
  | "config-public"
  | "whoami"
  | "ping"
  | "ghas-proxy"
  | "routes"
  | "link-check";

export const FEATURE_IDS: FeatureId[] = [
  "readyz",
  "livez",
  "startupz",
  "healthz",
  "version",
  "features",
  "status",
  "peers",
  "deps",
  "mesh-graph",
  "chain-health",
  "discover",
  "capabilities",
  "metrics-lite",
  "config-public",
  "whoami",
  "ping",
  "ghas-proxy",
  "routes",
  "link-check",
];

if (FEATURE_IDS.length !== 20) {
  throw new Error(`expected 20 features, got ${FEATURE_IDS.length}`);
}

export type ServiceMeta = {
  id: MeshServiceId;
  portEnv: string;
  healthPath: string;
  role: string;
  ghas_borrow: string;
};

/** Catalog of estate services participating in the mesh */
export function serviceCatalog(): ServiceMeta[] {
  return [
    {
      id: "bornite",
      portEnv: "HERD_PORT",
      healthPath: "/health",
      role: "llm-front-door",
      ghas_borrow: "openai-compat + models/sse keep-alive",
    },
    {
      id: "rust-web",
      portEnv: "RUST_WEB_PORT",
      healthPath: "/health",
      role: "ops-dashboard",
      ghas_borrow: "k8s-style /ops/api/* status surfaces",
    },
    {
      id: "yote",
      portEnv: "YOTE_PORT",
      healthPath: "/health",
      role: "telegram-bot",
      ghas_borrow: "agent health chain + overlord",
    },
    {
      id: "rig",
      portEnv: "RIG_PORT",
      healthPath: "/api/health",
      role: "agent-kernel",
      ghas_borrow: "multi-provider hand swarm",
    },
    {
      id: "estate-router",
      portEnv: "ESTATE_ROUTER_PORT",
      healthPath: "/health",
      role: "model-router",
      ghas_borrow: "circuit-breaker health DB + sticky sessions",
    },
    {
      id: "prometheus",
      portEnv: "PROMETHEUS_PORT",
      healthPath: "/-/ready",
      role: "metrics",
      ghas_borrow: "prom ready/live endpoints",
    },
    {
      id: "hf-downloader",
      portEnv: "HF_DOWNLOADER_PORT",
      healthPath: "/",
      role: "model-fetch",
      ghas_borrow: "bodaay HFD hub layout",
    },
    {
      id: "null-g-proxy",
      portEnv: "NULL_G_PROXY_PORT",
      healthPath: "/health",
      role: "edge-proxy",
      ghas_borrow: "feature-flag health banner",
    },
    {
      id: "grafana",
      portEnv: "GRAFANA_PORT",
      healthPath: "/api/health",
      role: "dashboards",
      ghas_borrow: "observability mesh leaf",
    },
    {
      id: "ghas-api",
      portEnv: "GHAS_API_PORT",
      healthPath: "/health",
      role: "github-search-api",
      ghas_borrow: "dual-engine code search + packs",
    },
    {
      id: "ghas-mcp",
      portEnv: "GHAS_MCP_PORT",
      healthPath: "/health",
      role: "github-search-mcp",
      ghas_borrow: "MCP stdio+http tool surface",
    },
    {
      id: "mesh-hub",
      portEnv: "MESH_HUB_PORT",
      healthPath: "/health",
      role: "mesh-orchestrator",
      ghas_borrow: "service-discovery hub + chain-health",
    },
    {
      id: "brand",
      portEnv: "BRAND_PORT",
      healthPath: "/health",
      role: "build-server",
      ghas_borrow: "disk-backed build queue + worker pool",
    },
    {
      id: "bench-radar",
      portEnv: "BENCH_RADAR_PORT",
      healthPath: "/health",
      role: "benchmark-regression-radar",
      ghas_borrow: "rolling median/MAD change-point detection + reactive WS push",
    },
  ];
}

const startedAt = Date.now();

async function probe(
  url: string,
  timeoutMs = 1200,
): Promise<{ ok: boolean; status: number; ms: number; body?: string }> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "accept-encoding": "identity", accept: "*/*" },
    });
    const body = (await res.text()).slice(0, 240);
    return { ok: res.ok, status: res.status, ms: Math.round(performance.now() - t0), body };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Math.round(performance.now() - t0),
      body: String(e).slice(0, 160),
    };
  }
}

export type MeshCtx = {
  service: MeshServiceId;
  localHealthy?: () => boolean | Promise<boolean>;
  version?: string;
  extra?: Record<string, unknown>;
};

function baseMeta(ctx: MeshCtx): ServiceMeta {
  const m = serviceCatalog().find((s) => s.id === ctx.service);
  if (!m) throw new Error(`unknown mesh service ${ctx.service}`);
  return m;
}

/** Execute one of the 20 features for a service context */
export async function runFeature(
  feature: FeatureId,
  ctx: MeshCtx,
  url?: URL,
): Promise<{ status: number; body: unknown }> {
  const self = baseMeta(ctx);
  const cat = serviceCatalog();
  const uptime = Math.floor((Date.now() - startedAt) / 1000);
  const localOk = ctx.localHealthy ? await ctx.localHealthy() : true;

  switch (feature) {
    case "readyz": {
      const ok = localOk;
      return { status: ok ? 200 : 503, body: { feature, service: ctx.service, ready: ok, ghas: "k8s-readyz" } };
    }
    case "livez":
      return { status: 200, body: { feature, service: ctx.service, live: true, pid: process.pid } };
    case "startupz":
      return {
        status: 200,
        body: { feature, service: ctx.service, started: true, uptime_s: uptime },
      };
    case "healthz": {
      const p = await probe(urlFor(self, self.healthPath));
      return {
        status: p.ok ? 200 : 503,
        body: { feature, service: ctx.service, healthy: p.ok, probe: p, role: self.role },
      };
    }
    case "version":
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          version: ctx.version || process.env.ESTATE_VERSION || "mesh-1.0.0",
          node: process.version,
          bun: typeof Bun !== "undefined" ? Bun.version : null,
        },
      };
    case "features":
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          count: FEATURE_IDS.length,
          features: FEATURE_IDS,
          ghas_origin: "kubernetes apiserver ready/live + GHAS dual-engine search mesh",
        },
      };
    case "status":
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          role: self.role,
          port: requirePort(self.portEnv),
          uptime_s: uptime,
          local_ok: localOk,
          ghas_borrow: self.ghas_borrow,
          extra: ctx.extra || {},
        },
      };
    case "peers": {
      const peers = cat
        .filter((s) => s.id !== ctx.service)
        .map((s) => ({ id: s.id, url: urlFor(s), mesh: `${urlFor(s)}/mesh/features`, role: s.role }));
      return { status: 200, body: { feature, service: ctx.service, peers, count: peers.length } };
    }
    case "deps": {
      const edges: Record<MeshServiceId, MeshServiceId[]> = {
        bornite: [],
        "rust-web": ["bornite", "hf-downloader", "prometheus"],
        yote: ["rig", "bornite"],
        rig: ["bornite"],
        "estate-router": ["bornite"],
        prometheus: [],
        "hf-downloader": [],
        "null-g-proxy": ["bornite", "estate-router"],
        grafana: ["prometheus"],
        "ghas-api": ["ghas-mcp"],
        "ghas-mcp": [],
        "mesh-hub": cat.map((c) => c.id).filter((id) => id !== "mesh-hub"),
        brand: [],
        "bench-radar": [],
      };
      return {
        status: 200,
        body: { feature, service: ctx.service, depends_on: edges[ctx.service] || [] },
      };
    }
    case "mesh-graph": {
      const nodes = cat.map((s) => ({
        id: s.id,
        port: Number(process.env[s.portEnv] || 0),
        role: s.role,
      }));
      return {
        status: 200,
        body: { feature, service: ctx.service, nodes, edges_note: "see /mesh/deps on each node" },
      };
    }
    case "chain-health": {
      const results: Record<string, unknown> = {};
      let all = true;
      await Promise.all(
        cat.map(async (s) => {
          const r = await probe(urlFor(s, s.healthPath));
          results[s.id] = r;
          if (!r.ok && s.id !== "mesh-hub") all = false;
        }),
      );
      return {
        status: all ? 200 : 207,
        body: {
          feature,
          service: ctx.service,
          all_ok: all,
          results,
          ghas: "meshcore-health-check style fan-out",
        },
      };
    }
    case "discover":
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          catalog: cat.map((s) => ({
            id: s.id,
            base: urlFor(s),
            health: urlFor(s, s.healthPath),
            mesh_prefix: `${urlFor(s)}/mesh`,
            role: s.role,
          })),
        },
      };
    case "capabilities":
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          capabilities: {
            mesh: true,
            ghas_linked: true,
            hot_reload: true,
            openai_compat: ["bornite", "estate-router", "null-g-proxy", "yote", "rig"].includes(ctx.service),
            search: ctx.service.startsWith("ghas"),
          },
        },
      };
    case "metrics-lite":
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          uptime_s: uptime,
          rss: process.memoryUsage?.().rss ?? null,
          pid: process.pid,
        },
      };
    case "config-public":
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          public: {
            port_env: self.portEnv,
            health_path: self.healthPath,
            role: self.role,
            llm_base: process.env.LLM_BASE_URL || null,
            ghas_api: process.env.GHAS_API_PORT ? `http://127.0.0.1:${process.env.GHAS_API_PORT}` : null,
          },
        },
      };
    case "whoami":
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          host: "127.0.0.1",
          port: requirePort(self.portEnv),
          role: self.role,
          ghas_borrow: self.ghas_borrow,
        },
      };
    case "ping": {
      const echo = url?.searchParams.get("echo") || "pong";
      return { status: 200, body: { feature, service: ctx.service, echo, ts: Date.now() } };
    }
    case "ghas-proxy": {
      const q = url?.searchParams.get("q") || "estate mesh";
      const ghasPort = process.env.GHAS_API_PORT || "25112";
      const ghasUrl = `http://127.0.0.1:${ghasPort}/health`;
      const health = await probe(ghasUrl);
      let search: unknown = null;
      if (health.ok && url?.searchParams.get("search") === "1") {
        try {
          const sr = await fetch(
            `http://127.0.0.1:${ghasPort}/api/search?q=${encodeURIComponent(q)}&per_page=3`,
            { signal: AbortSignal.timeout(8000) },
          );
          search = await sr.json().catch(() => ({ status: sr.status }));
        } catch (e) {
          search = { error: String(e) };
        }
      }
      return {
        status: health.ok ? 200 : 503,
        body: {
          feature,
          service: ctx.service,
          ghas_health: health,
          ghas_url: `http://127.0.0.1:${ghasPort}`,
          query: q,
          search,
          note: "Use ?search=1&q=term to fan-out to GHAS API",
        },
      };
    }
    case "routes":
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          routes: FEATURE_IDS.map((f) => `/mesh/${f}`),
          alias: ["/mesh", "/mesh/", "/mesh/features"],
        },
      };
    case "link-check": {
      const hubPort = process.env.MESH_HUB_PORT || "25115";
      const hub = await probe(`http://127.0.0.1:${hubPort}/health`);
      const selfProbe = await probe(urlFor(self, self.healthPath));
      return {
        status: hub.ok && selfProbe.ok ? 200 : 207,
        body: { feature, service: ctx.service, self: selfProbe, mesh_hub: hub, linked: hub.ok && selfProbe.ok },
      };
    }
    default:
      return { status: 404, body: { error: "unknown feature", feature } };
  }
}

/**
 * Handle HTTP for /mesh and /mesh/{feature}.
 * Returns null if path is not a mesh path (caller continues).
 */
export async function handleMeshRequest(
  req: Request,
  ctx: MeshCtx,
): Promise<Response | null> {
  const u = new URL(req.url);
  const path = u.pathname;
  if (!path.startsWith("/mesh")) return null;

  if (path === "/mesh" || path === "/mesh/") {
    const { status, body } = await runFeature("features", ctx, u);
    return json(status, body);
  }

  const rest = path.slice("/mesh/".length).replace(/\/$/, "");
  if (!rest) {
    const { status, body } = await runFeature("features", ctx, u);
    return json(status, body);
  }

  if (rest.startsWith("s/")) {
    const parts = rest.split("/");
    const sid = parts[1] as MeshServiceId;
    const feat = (parts[2] || "features") as FeatureId;
    const f = (FEATURE_IDS.includes(feat) ? feat : "features") as FeatureId;
    const nested: MeshCtx = { ...ctx, service: sid };
    const { status, body } = await runFeature(f, nested, u);
    return json(status, body);
  }

  const feat = rest as FeatureId;
  if (!FEATURE_IDS.includes(feat)) {
    return json(404, { error: "unknown mesh feature", path, known: FEATURE_IDS });
  }
  const { status, body } = await runFeature(feat, ctx, u);
  return json(status, body);
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "x-estate-mesh": "ghas-20",
    },
  },
  );
}

/** Hono-compatible mount helper */
export function meshFetchFor(ctx: MeshCtx) {
  return async (req: Request): Promise<Response | null> => handleMeshRequest(req, ctx);
}
