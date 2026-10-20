import { describe, expect, test } from "bun:test";
import type { Degradation } from "@ghas/contracts";
import { fail, ok } from "./envelope";

const degradation: Degradation = {
  level: "rate_limit",
  reason: "github api rate limited (HTTP 403)",
  backend_failed: "github_api",
  backend_used: "mcp_tool",
};

describe("ok envelope", () => {
  test("without degradation: degraded false, no degradation key", () => {
    const env = ok("api", { hello: "world" }, "direct_github", 12);
    expect(env.ok).toBe(true);
    expect(env.meta.degraded).toBe(false);
    expect("degradation" in env.meta).toBe(false);
    expect(env.meta.backend).toBe("direct_github");
    expect(env.meta.latency_ms).toBe(12);
  });

  test("with degradation: degraded true and full degradation payload", () => {
    const env = ok("hybrid", { hello: "world" }, "mcp_tool", 34, degradation);
    expect(env.meta.degraded).toBe(true);
    expect(env.meta.degradation).toEqual(degradation);
    expect(env.meta.degradation?.level).toBe("rate_limit");
    expect(env.meta.degradation?.backend_failed).toBe("github_api");
    expect(env.meta.degradation?.backend_used).toBe("mcp_tool");
  });

  test("extra meta is merged in", () => {
    const env = ok("api", {}, "api", 5, undefined, { strict_applied: true });
    expect(env.meta.strict_applied).toBe(true);
    expect(env.meta.degraded).toBe(false);
  });
});

describe("fail envelope", () => {
  test("without degradation: degraded false, error populated", () => {
    const env = fail("missing_query", "Query required");
    expect(env.ok).toBe(false);
    expect(env.meta.degraded).toBe(false);
    expect("degradation" in env.meta).toBe(false);
    expect(env.error).toEqual({ code: "missing_query", message: "Query required", details: undefined });
  });

  test("with degradation: degraded true and degradation payload", () => {
    const env = fail("internal_error", "boom", 42, "stack", degradation);
    expect(env.meta.degraded).toBe(true);
    expect(env.meta.degradation).toEqual(degradation);
    expect(env.meta.latency_ms).toBe(42);
    expect(env.error?.details).toBe("stack");
  });
});
