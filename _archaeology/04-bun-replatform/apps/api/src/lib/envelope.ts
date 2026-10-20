import type { ApiEnvelope } from "@ghas/contracts";

export function ok<T>(
  source: ApiEnvelope<T>["source"],
  data: T,
  backend: string,
  latencyMs: number,
  degraded = false,
): ApiEnvelope<T> {
  return {
    ok: true,
    source,
    data,
    meta: {
      latency_ms: latencyMs,
      backend,
      session_id: process.env.AG_SESSION_ID,
      degraded,
    },
  };
}

export function fail(
  code: string,
  message: string,
  latencyMs = 0,
  details?: string,
): ApiEnvelope<Record<string, never>> {
  return {
    ok: false,
    source: "api",
    data: {},
    meta: {
      latency_ms: latencyMs,
      backend: "api",
      session_id: process.env.AG_SESSION_ID,
      degraded: true,
    },
    error: { code, message, details },
  };
}
