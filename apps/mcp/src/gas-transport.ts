/**
 * Custom Streamable HTTP transport for the GHAS MCP server.
 *
 * "July 2026 grade" real streaming transport. Why we own this instead of
 * using the SDK's `WebStandardStreamableHTTPServerTransport`:
 *
 *  - The SDK transport's `handlePostRequest` requires the client to send
 *    `Accept: application/json, text/event-stream` on every POST. mcpproxy
 *    and several MCP clients send `Accept: application/json`-only on the
 *    initialize POST, which the SDK rejects with `406 Not Acceptable`. That
 *    broke tool discovery end-to-end. This transport accepts
 *    `application/json`-only POSTs (spec-compliant) while still supporting
 *    SSE streaming when the client asks for `text/event-stream`.
 *  - We control Accept-header negotiation and event-streaming so the pi fork
 *    MCP client (StreamableHTTPClientTransport, protocol 2025-11-25) and
 *    mcpproxy (mcp-go) both work without 406s or init timeouts.
 *  - GHAS can stream search results as SSE events for low-latency UI.
 *
 * Response-correlation model (the key insight): the MCP `Protocol` processes
 * each request through an async/microtask chain and then calls
 * `transport.send(response)`. The response message carries an `id` matching
 * the request `id`. We maintain a Map<requestId, {resolve, reject, msgs}>
 * so that concurrent POSTs (e.g. mcpproxy's init + a client's tools/list)
 * each collect only their own responses — no cross-talk from a shared
 * global field. This mirrors the SDK's `_requestToStreamMapping`.
 *
 * Transport interface contract (mirrors StdioServerTransport):
 *   - `send(message)`: Protocol calls this to deliver server->client messages.
 *   - `this.onmessage(msg)`: Protocol REPLACES this on connect(); the transport
 *     calls it to forward client->server messages.
 *   - `start()`, `close()`, `sessionId`.
 */
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  isInitializeRequest,
  isJSONRPCRequest,
  type JSONRPCMessage,
  SUPPORTED_PROTOCOL_VERSIONS,
  DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
} from "@modelcontextprotocol/sdk/types.js";

export interface SseStreamController {
  enqueue: (data: JSONRPCMessage) => void;
  close: () => void;
}

export interface McpSession {
  id: string;
  protocolVersion: string;
  controllers: Set<SseStreamController>;
  closed: boolean;
}

/** Per-request response waiter, keyed by the JSON-RPC message id. */
interface PendingRequest {
  resolve: (msgs: JSONRPCMessage[]) => void;
  timeout: NodeJS.Timeout;
  collected: JSONRPCMessage[];
}

const PROTOCOL_VERSION = DEFAULT_NEGOTIATED_PROTOCOL_VERSION;

function encodeSseEvent(data: JSONRPCMessage): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function jsonOk(body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function jsonError(
  status: number,
  code: number,
  message: string,
  extra: Record<string, string> = {},
) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: null, error: { code, message } }),
    { status, headers: { "Content-Type": "application/json", ...extra } },
  );
}

function parseBody(text: string): unknown {
  if (!text) return undefined;
  return JSON.parse(text);
}

/** Extract the JSON-RPC id from a message (number, string, or null). */
function msgId(msg: JSONRPCMessage): string {
  const m: any = msg as any;
  return m?.id === undefined || m?.id === null ? "null" : String(m.id);
}

/**
 * Custom Streamable HTTP transport optimized for the GHAS MCP server.
 */
export class GhasStreamableHttpTransport {
  private sessions: Map<string, McpSession> = new Map();

  /**
   * Per-request response correlation. The Protocol calls send() for each
   * response with a message whose `id` matches the original request `id`.
   * We route send() to the right waiter so concurrent requests don't mix.
   */
  private pendingRequests: Map<string, PendingRequest> = new Map();

  /** Session-bound for SSE streaming (set when send() targets a streaming session). */
  private streamingSessionId: string | undefined;

  onmessage?: (message: JSONRPCMessage, extra?: Record<string, unknown>) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  sessionId?: string;

  handleRequest(request: Request): Promise<Response> {
    const accept = request.headers.get("accept") ?? "";
    switch (request.method) {
      case "POST":
        return this.handlePost(request, accept);
      case "GET":
        return Promise.resolve(this.handleGet(request, accept));
      case "DELETE":
        return Promise.resolve(this.handleDelete(request));
      default:
        return Promise.resolve(
          jsonError(405, -32000, "Method not allowed", { Allow: "POST, GET, DELETE" }),
        );
    }
  }

  // ── Protocol transport contract ───────────────────────────────────────────
  /** The Protocol calls send() to push a message from the server to the client. */
  async send(
    message: JSONRPCMessage,
    options?: { relatedRequestId?: string },
  ): Promise<void> {
    // If currently streaming to a session, route to its SSE controllers
    if (this.streamingSessionId) {
      const session = this.sessions.get(this.streamingSessionId);
      if (session && !session.closed) {
        for (const controller of session.controllers) controller.enqueue(message);
        return;
      }
    }
    // Otherwise, route to the per-request response waiter by message id
    const id = options?.relatedRequestId
      ? String(options.relatedRequestId)
      : msgId(message);
    const pending = this.pendingRequests.get(id);
    if (pending) {
      pending.collected.push(message);
      if (!pending.resolve) return; // already consumed
      const resolve = pending.resolve;
      const timeout = pending.timeout;
      clearTimeout(timeout);
      this.pendingRequests.delete(id);
      resolve(pending.collected);
      return;
    }
    // Fallback: no waiter (e.g. SSE streaming mid-flight) — drop silently
  }

  async start() {}

  async close() {
    for (const session of this.sessions.values()) {
      session.closed = true;
      for (const controller of session.controllers) controller.close();
    }
    this.sessions.clear();
    this.pendingRequests.clear();
    this.onclose?.();
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  private getSessionId(request: Request): string | null {
    return request.headers.get("mcp-session-id");
  }

  private negotiateProtocolVersion(requested?: string): string {
    if (!requested) return PROTOCOL_VERSION;
    return SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
      ? requested
      : PROTOCOL_VERSION;
  }

  private getSession(request: Request): McpSession | Response {
    const sid = this.getSessionId(request);
    if (!sid) {
      return jsonError(
        400,
        -32000,
        "Invalid request: Mcp-Session-Id header is required.",
      );
    }
    const session = this.sessions.get(sid);
    if (!session || session.closed) {
      return jsonError(404, -32000, "Invalid or expired session ID.");
    }
    return session;
  }

  private validateProtocolVersion(request: Request): Response | undefined {
    const version = request.headers.get("mcp-protocol-version");
    if (version && !SUPPORTED_PROTOCOL_VERSIONS.includes(version)) {
      return jsonError(
        400,
        -32000,
        `Unsupported protocol version: ${version}. Supported: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")}`,
      );
    }
    return undefined;
  }

  private buildRequestInfo(request: Request) {
    return {
      headers: Object.fromEntries(request.headers.entries()),
      url: new URL(request.url),
    };
  }

  /**
   * Dispatch messages to the Protocol (via this.onmessage) and await their
   * responses, correlated by message id. Returns resolved when send() is
   * called for the matching id, or after timeoutMs (returns what we have).
   */
  private waitForResponses(
    messages: JSONRPCMessage[],
    request: Request,
    timeoutMs = 2000,
  ): Promise<JSONRPCMessage[]> {
    const requestInfo = this.buildRequestInfo(request);
    const requestIds = messages
      .filter(isJSONRPCRequest)
      .map((m) => msgId(m));

    // Set up waiters for each request id
    const waiters: Promise<JSONRPCMessage[]>[] = [];
    for (const rid of requestIds) {
      const promise = new Promise<JSONRPCMessage[]>((resolve) => {
        const pending: PendingRequest = {
          resolve,
          timeout: setTimeout(() => {
            this.pendingRequests.delete(rid);
            resolve([]);
          }, timeoutMs),
          collected: [],
        };
        this.pendingRequests.set(rid, pending);
      });
      waiters.push(promise);
    }

    // Forward messages to the Protocol (which calls send() with responses)
    for (const message of messages) {
      this.onmessage?.(message, { requestInfo });
    }

    if (waiters.length === 0) {
      // Notifications only — no response expected
      return Promise.resolve([]);
    }
    return Promise.all(waiters).then((results) =>
      results.flat(),
    );
  }

  // ── POST ──────────────────────────────────────────────────────────────
  private async handlePost(request: Request, accept: string): Promise<Response> {
    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return jsonError(400, -32700, "Parse error: Invalid body");
    }
    let parsed: unknown;
    try {
      parsed = parseBody(rawBody);
    } catch {
      return jsonError(400, -32700, "Parse error: Invalid JSON");
    }
    const messages: JSONRPCMessage[] = Array.isArray(parsed)
      ? (parsed as JSONRPCMessage[])
      : [parsed as JSONRPCMessage];

    const maybeInit = messages[0];
    const headers: Record<string, string> = {};

    // ── Initialize ──
    if (maybeInit && isInitializeRequest(maybeInit)) {
      const protocolVersion = this.negotiateProtocolVersion(
        maybeInit.params?.protocolVersion,
      );
      const sid = crypto.randomUUID();
      const session: McpSession = {
        id: sid,
        protocolVersion,
        controllers: new Set(),
        closed: false,
      };
      this.sessions.set(sid, session);

      headers["Mcp-Session-Id"] = sid;
      headers["Mcp-Protocol-Version"] = protocolVersion;

      // Init POST: always return JSON unless the client ONLY accepts SSE
      // (no application/json). mcpproxy and the pi client send both, so they
      // get a JSON response with session headers — the standard MCP pattern.
      const wantsSseOnly =
        accept.includes("text/event-stream") &&
        !accept.includes("application/json");

      if (wantsSseOnly) {
        const stream = this.createSseStream(session);
        this.streamingSessionId = sid;
        const responses = await this.waitForResponses([maybeInit], request, 2000);
        this.streamingSessionId = undefined;
        for (const msg of responses) {
          for (const controller of session.controllers) controller.enqueue(msg);
        }
        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            ...headers,
          },
        });
      }

      // JSON response path (mcpproxy / pi / default) — send() routes to
      // pendingRequests by id via the per-request waiter.
      const responses = await this.waitForResponses([maybeInit], request, 2000);

      return jsonOk(responses.length === 1 ? responses[0] : responses, headers);
    }

    // ── Non-initialize POST ──
    const sessionOrErr = this.getSession(request);
    if (sessionOrErr instanceof Response) return sessionOrErr;
    const session = sessionOrErr as McpSession;
    const protocolError = this.validateProtocolVersion(request);
    if (protocolError) return protocolError;

    // SSE streaming path — only when client does NOT accept JSON
    const wantsSseOnly =
      accept.includes("text/event-stream") &&
      !accept.includes("application/json");
    if (wantsSseOnly) {
      const stream = this.createSseStream(session);
      this.streamingSessionId = session.id;
      const responses = await this.waitForResponses(messages, request, 2000);
      for (const msg of responses) {
        for (const controller of session.controllers) controller.enqueue(msg);
      }
      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "Mcp-Session-Id": session.id,
        },
      });
    }

    // JSON response path — route by request id
    const responses = await this.waitForResponses(messages, request, 2000);

    // No responses = notification only (e.g. `initialized`) → 202 Accepted
    if (responses.length === 0) {
      return new Response(null, {
        status: 202,
        headers: { "Mcp-Session-Id": session.id },
      });
    }

    return jsonOk(responses.length === 1 ? responses[0] : responses, {
      "Mcp-Session-Id": session.id,
    });
  }

  // ── GET: SSE stream ─────────────────────────────────────────────────
  private handleGet(request: Request, accept: string): Response {
    if (!accept.includes("text/event-stream")) {
      return jsonError(
        406,
        -32000,
        "Not Acceptable: GET /mcp requires Accept: text/event-stream",
      );
    }
    const session = this.getSession(request);
    if (session instanceof Response) return session;
    const protocolError = this.validateProtocolVersion(request);
    if (protocolError) return protocolError;
    const s = session as McpSession;
    return new Response(this.createSseStream(s), {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Mcp-Session-Id": s.id,
      },
    });
  }

  private createSseStream(session: McpSession): ReadableStream {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start: (controller) => {
        const sseController: SseStreamController = {
          enqueue: (data) => {
            try {
              controller.enqueue(encoder.encode(encodeSseEvent(data)));
            } catch {
              /* stream closed */
            }
          },
          close: () => {
            try {
              controller.close();
            } catch {
              /* already closed */
            }
            session.controllers.delete(sseController);
          },
        };
        session.controllers.add(sseController);
      },
      cancel: () => {
        for (const c of session.controllers) c.close();
        session.controllers.clear();
      },
    });
  }

  // ── DELETE ──────────────────────────────────────────────────────────
  private handleDelete(request: Request): Response {
    const sid = this.getSessionId(request);
    if (!sid) {
      return jsonError(400, -32000, "Mcp-Session-Id header is required");
    }
    const session = this.sessions.get(sid);
    if (!session) {
      return jsonError(404, -32000, "Session not found");
    }
    session.closed = true;
    for (const controller of session.controllers) controller.close();
    this.sessions.delete(sid);
    return new Response(null, {
      status: 200,
      headers: { "Mcp-Session-Id": sid },
    });
  }
}

export function createGhasTransport(server: Server): GhasStreamableHttpTransport {
  return new GhasStreamableHttpTransport(server);
}
