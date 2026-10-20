import { describe, expect, test } from "bun:test";
import { BackendError, classifyGithubError } from "./backend-error";

describe("classifyGithubError", () => {
  test("maps 401 to auth", () => {
    const err = classifyGithubError(new Error("GitHub 401: Bad credentials"));
    expect(err).toBeInstanceOf(BackendError);
    expect(err.level).toBe("auth");
    expect(err.backend).toBe("github_api");
  });

  test("maps 403 to rate_limit", () => {
    const err = classifyGithubError(new Error("GitHub 403: API rate limit exceeded"));
    expect(err.level).toBe("rate_limit");
  });

  test("maps 429 to rate_limit", () => {
    const err = classifyGithubError(new Error("Blackbird search HTTP 429"));
    expect(err.level).toBe("rate_limit");
  });

  test("maps timeout/abort/network errors to timeout", () => {
    expect(classifyGithubError(new Error("request timed out after 30s")).level).toBe("timeout");
    expect(classifyGithubError(new Error("fetch failed")).level).toBe("timeout");
    expect(classifyGithubError(new Error("socket ECONNRESET")).level).toBe("timeout");
  });

  test("maps 5xx to backend_down", () => {
    expect(classifyGithubError(new Error("GitHub 502: bad gateway")).level).toBe("backend_down");
    expect(classifyGithubError(new Error("GitHub 503: service unavailable")).level).toBe("backend_down");
  });

  test("maps unknown errors to internal", () => {
    expect(classifyGithubError(new Error("something weird happened")).level).toBe("internal");
    expect(classifyGithubError("plain string failure").level).toBe("internal");
    expect(classifyGithubError(undefined).level).toBe("internal");
  });

  test("passes through an existing BackendError unchanged", () => {
    const original = new BackendError("rate_limit", "already classified", "mcp_tool");
    expect(classifyGithubError(original)).toBe(original);
  });

  test("honours a custom backend label", () => {
    const err = classifyGithubError(new Error("GitHub 401"), "mcp_tool");
    expect(err.backend).toBe("mcp_tool");
  });
});
