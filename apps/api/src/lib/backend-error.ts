import type { DegradationLevel } from "@ghas/contracts";

export class BackendError extends Error {
  constructor(
    public readonly level: DegradationLevel,
    message: string,
    public readonly backend: string,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

const STATUS_RE = /(?:GitHub|Blackbird search HTTP) (\d{3})/;

/** Map any backend failure to a leveled BackendError (rate limit, auth, ...). */
export function classifyGithubError(err: unknown, backend = "github_api"): BackendError {
  if (err instanceof BackendError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const status = Number(STATUS_RE.exec(msg)?.[1] ?? NaN);
  if (status === 401) {
    return new BackendError("auth", "github api auth failed (401): missing or bad token", backend);
  }
  if (status === 403 || status === 429) {
    return new BackendError("rate_limit", `github api rate limited (HTTP ${status})`, backend);
  }
  if (/timeout|timed out|abort|ECONNRESET|ETIMEDOUT|fetch failed/i.test(msg)) {
    return new BackendError("timeout", msg.slice(0, 200), backend);
  }
  if (status >= 500 || /request failed/i.test(msg)) {
    return new BackendError("backend_down", `github api unavailable: ${msg.slice(0, 160)}`, backend);
  }
  return new BackendError("internal", msg.slice(0, 200) || "unknown backend error", backend);
}
