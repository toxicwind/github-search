import type { ApiEnvelope, Degradation } from "@ghas/contracts";

export function ok<T>(
  source: ApiEnvelope<T>["source"],
  data: T,
  backend: string,
  latencyMs: number,
  degradation?: Degradation,
  extraMeta: Partial<ApiEnvelope<T>["meta"]> = {},
): ApiEnvelope<T> {
  return {
    ok: true,
    source,
    data,
    meta: {
      latency_ms: latencyMs,
      backend,
      session_id: process.env.AG_SESSION_ID,
      degraded: degradation != null,
      ...(degradation ? { degradation } : {}),
      ...extraMeta,
    },
  };
}

export function fail(
  code: string,
  message: string,
  latencyMs = 0,
  details?: string,
  degradation?: Degradation,
): ApiEnvelope<Record<string, never>> {
  return {
    ok: false,
    source: "api",
    data: {},
    meta: {
      latency_ms: latencyMs,
      backend: "api",
      session_id: process.env.AG_SESSION_ID,
      degraded: degradation != null,
      ...(degradation ? { degradation } : {}),
    },
    error: { code, message, details },
  };
}
