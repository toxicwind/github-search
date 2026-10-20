# Chronos Forge v5.0 - GitHub MCP Server Dockerfile
# Production build for gh-search-mcp

FROM rust:latest AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests for dependency caching
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates

# Build release binary
RUN cargo build --release -p gh-search-mcp

# ═══════════════════════════════════════════════════════════════════════════════
# Runtime Stage
# ═══════════════════════════════════════════════════════════════════════════════
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

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD curl -sf http://localhost:42305/health || exit 1

EXPOSE 42305

CMD ["/app/gh-search-mcp", "--http"]
