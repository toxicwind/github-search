/**
 * estate-mesh — mesh feature registry (20 features) + ports SSOT loader.
 *
 * Borrowed patterns: k8s ready/live/startup, service discovery, dependency graph,
 * version/capabilities. Self-contained: no cross-repo imports. Ports resolve from
 * GHAS_* env first, then the estate SSOT file (resolved read-only, parse-only).
 *
 * Mount via handleMeshRequest() on /mesh/* of any service, or run mesh-hub.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Port SSOT (self-contained)
// ---------------------------------------------------------------------------
const SOV = process.env.ESTATE_ROOT || resolve(homedir(), "pens", "estate");

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

const PORTS_SSOT_CANDIDATES = [
  resolve(homedir(), "pens", "ranch", "ssot", "ports.env"),
  resolve(homedir(), "pens", "barn", "ssot", "ports.env"),
  resolve(homedir(), "pens", "estate", "config", "ports.env"),
];

function loadPorts(): void {
  if (portsLoaded) return;
  portsLoaded = true;
  let file = "";
  for (const c of PORTS_SSOT_CANDIDATES) {
    if (existsSync(c)) { file = c; break; }
  }
  if (!file) return;
  for (const [k, v] of Object.entries(parseEnvFile(file))) {
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
    const d = defaultPort(name);
    if (d !== undefined) return d;
    throw new Error(`${name} required — set in ${SOV}/config/ports.env (25xxx SSOT)`);
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    throw new Error(`${name} must be a valid TCP port, got ${v}`);
  }
  return n;
}

function defaultPort(name: string): number | undefined {
  return MESH_DEFAULT_PORTS[name];
}

function urlFor(meta: ServiceMeta, path = ""): string {
  const port = requirePort(meta.portEnv);
  const p = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `http://127.0.0.1:${port}${p}`;
}

// ---------------------------------------------------------------------------
// Internal port defaults — mesh is self-contained. Env (via loadPorts from the
// estate SSOT) wins; these defaults apply only when nothing else is set.
// ---------------------------------------------------------------------------

const MESH_DEFAULT_PORTS: Record<string, number> = {
  BORNITE_PORT: 25100,
  RUST_WEB_PORT: 25201,
  YOTE_RELAY_PORT: 25102,
  RIG_PORT: 25103,
  ESTATE_ROUTER_PORT: 25104,
  PROMETHEUS_PORT: 25105,
  FEEDLOT_MCP_PORT: 25226,
  NULL_G_PROXY_PORT: 25107,
  GRAFANA_PORT: 25110,
  GHAS_API_PORT: 25112,
  GHAS_MCP_PORT: 25113,
  MESH_HUB_PORT: 25115,
  BOUNDLESS_PORT: 25197,
  BENCH_RADAR_PORT: 25181,
};

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
      portEnv: "BORNITE_PORT",
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
      portEnv: "YOTE_RELAY_PORT",
      healthPath: "/health",
      role: "telegram-gateway",
      ghas_borrow: "openfang forwarder + coyote sigil loop",
    },
    {
      id: "rig",
      portEnv: "RIG_PORT",
      healthPath: "/health",
      role: "worker-control-plane",
      ghas_borrow: "task lane + checkpoint store",
    },
    {
      id: "estate-router",
      portEnv: "ESTATE_ROUTER_PORT",
      healthPath: "/health",
      role: "route-control-plane",
      ghas_borrow: "schema registry + api-address discovery",
    },
    {
      id: "prometheus",
      portEnv: "PROMETHEUS_PORT",
      healthPath: "/health",
      role: "metrics-front-door",
      ghas_borrow: "scrape target registry",
    },
    {
      id: "hf-downloader",
      portEnv: "FEEDLOT_MCP_PORT",
      healthPath: "/health",
      role: "model-file-downloader",
      ghas_borrow: "dataset fetch lane",
    },
    {
      id: "null-g-proxy",
      portEnv: "NULL_G_PROXY_PORT",
      healthPath: "/health",
      role: "edge-proxy",
      ghas_borrow: "provider credential rotation + cutover",
    },
    {
      id: "grafana",
      portEnv: "GRAFANA_PORT",
      healthPath: "/health",
      role: "observability-dashboard",
      ghas_borrow: "dashboards + alert routing",
    },
    {
      id: "ghas-api",
      portEnv: "GHAS_API_PORT",
      healthPath: "/api/health",
      role: "github-advanced-search-api",
      ghas_borrow: "blackbird web index + REST fallback",
    },
    {
      id: "ghas-mcp",
      portEnv: "GHAS_MCP_PORT",
      healthPath: "/health",
      role: "github-mcp-stdio-server",
      ghas_borrow: "session source for blackbird + code search",
    },
    {
      id: "mesh-hub",
      portEnv: "MESH_HUB_PORT",
      healthPath: "/health",
      role: "mesh-coordinator",
      ghas_borrow: "catalog + capability aggregation",
    },
    {
      id: "brand",
      portEnv: "BOUNDLESS_PORT",
      healthPath: "/health",
      role: "landing-page",
      ghas_borrow: "unified brand surface",
    },
    {
      id: "bench-radar",
      portEnv: "BENCH_RADAR_PORT",
      healthPath: "/health",
      role: "benchmark-radar",
      ghas_borrow: "nightly tps regressions",
    },
  ];
}

type ProbeResult = { ok: boolean; status?: number; ms?: number; error?: string };

async function probe(url: string): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return { ok: res.ok, status: res.status, ms: Date.now() - start };
  } catch (e) {
    return { ok: false, ms: Date.now() - start, error: String(e) };
  }
}

export type MeshCtx = {
  service: MeshServiceId;
  role?: string;
  localHealthy?: () => boolean;
  extra?: Record<string, unknown>;
  version?: string;
};

const uptime = Date.now();

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "x-estate-mesh": "ghas-20",
    },
  });
}

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

/** Hono-compatible mount helper */
export function meshFetchFor(ctx: MeshCtx) {
  return async (req: Request): Promise<Response | null> =>
    handleMeshRequest(req, ctx);
}

export async function runFeature(
  feature: FeatureId,
  ctx: MeshCtx,
  u?: URL,
): Promise<{ status: number; body: unknown }> {
  const cat = serviceCatalog();
  const self = cat.find((s) => s.id === ctx.service);
  if (!self) {
    return { status: 404, body: { error: "unknown service", service: ctx.service } };
  }
  const localOk = ctx.localHealthy ? ctx.localHealthy() : true;

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
    case "version": {
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
    }
    case "features": {
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
    }
    case "status": {
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
    }
    case "peers": {
      const peers = cat
        .filter((s) => s.id !== ctx.service)
        .map((s) => {
          try {
            return { id: s.id, url: urlFor(s), mesh: `${urlFor(s)}/mesh/features`, role: s.role };
          } catch {
            return null;
          }
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);
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
      const nodes = cat.map((s) => {
        let port: number;
        try {
          port = requirePort(s.portEnv);
        } catch {
          port = 0;
        }
        return { id: s.id, port, role: s.role };
      });
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
        },
      };
    }
    case "discover": {
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          catalog: cat.map((s) => ({ id: s.id, portEnv: s.portEnv, role: s.role })),
        },
      };
    }
    case "capabilities": {
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          capabilities: {
            mesh: true,
            ghas_linked: true,
            hot_reload: true,
            openai_compat: ["bornite", "estate-router", "null-g-proxy", "yote", "rig"].includes(
              ctx.service,
            ),
            search: ctx.service.startsWith("ghas"),
          },
        },
      };
    }
    case "metrics-lite": {
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
    }
    case "config-public": {
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
            ghas_api: process.env.GHAS_API_PORT
              ? `http://127.0.0.1:${process.env.GHAS_API_PORT}`
              : null,
          },
        },
      };
    }
    case "whoami": {
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
    }
    case "ping": {
      const echo = u?.searchParams.get("echo") || "pong";
      return { status: 200, body: { feature, service: ctx.service, echo, ts: Date.now() } };
    }
    case "ghas-proxy": {
      const q = u?.searchParams.get("q") || "estate mesh";
      const ghasPort = process.env.GHAS_API_PORT || "25112";
      const ghasUrl = `http://127.0.0.1:${ghasPort}/health`;
      const health = await probe(ghasUrl);
      let search: unknown = null;
      if (health.ok && u?.searchParams.get("search") === "1") {
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
        status: 200,
        body: { feature, service: ctx.service, health, query: q, search },
      };
    }
    case "routes": {
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          routes: ["/mesh", "/mesh/{feature}", "/mesh/s/{service}/{feature}"],
        },
      };
    }
    case "link-check": {
      return {
        status: 200,
        body: {
          feature,
          service: ctx.service,
          links: ["https://github.com/toxicwind/github-search"],
        },
      };
    }
    default:
      return { status: 404, body: { error: "unknown feature", feature } };
  }
}
