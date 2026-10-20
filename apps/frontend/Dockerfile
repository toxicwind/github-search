# HYPEBRUT SHELL-OS — USER-INTENT: Next.js + HYPEBRUT Aesthetics
# BASE: Node.js 20 (LTS) for stability + performance
FROM node:20-alpine AS base

# 1. DEPENDENCIES
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. BUILDER
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 3. RUNNER
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user (portable across images)
RUN set -eux; \
    if command -v addgroup >/dev/null 2>&1; then addgroup --system --gid 1001 nodejs; else groupadd -r -g 1001 nodejs; fi; \
    if command -v adduser >/dev/null 2>&1; then adduser --system --uid 1001 nextjs; else useradd -r -u 1001 -g nodejs -s /bin/sh -m nextjs; fi

# Copy source and build inside the runner to avoid multi-stage COPY mismatch
COPY . .
# Ensure devDependencies (TypeScript) are available for building next.config.ts
RUN npm ci --include=dev && npm run build

USER nextjs

EXPOSE ${GHAS_FRONTEND_PORT}
ENV PORT=${GHAS_FRONTEND_PORT}
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "run", "start", "--", "-p", "${PORT}"]
