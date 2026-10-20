# estate-scripts GitHub Advanced Search MCP (ghas)
# Canonical production Dockerfile for gh-search-mcp (Rust).
#
# Build modes (use --build-arg MODE=...):
#   MODE=stdio   (default) - for OpenFang stdio MCP integration
#   MODE=http    - for HTTP transport (used by infra and gateway)
#
# This unifies the previous root + infra duplication.

ARG MODE=stdio

FROM rust:1.83-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
COPY crates ./crates

RUN cargo build --release -p gh-search-mcp

FROM debian:bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/gh-search-mcp /app/gh-search-mcp

RUN mkdir -p /cache && chmod 755 /cache

ENV GH_SEARCH_CACHE_DIR=/cache
ENV RUST_LOG=info

# Default to stdio; HTTP mode adds the flag at runtime
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD curl -sf http://localhost:${HEALTH_PORT:-35105}/health || exit 1

EXPOSE 35105 42305

# MODE=stdio -> no extra args
# MODE=http  -> --http (port controlled by CMD/ compose)
CMD ["/app/gh-search-mcp", "--http"]
