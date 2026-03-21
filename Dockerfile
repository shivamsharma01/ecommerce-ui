# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# mcart-ui — Angular SSR (Node + Express)
# Multi-stage: install + build, then minimal runtime with production deps only.
# -----------------------------------------------------------------------------

ARG NODE_VERSION=22

# --- Build: compile browser + server bundles ---------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS build

WORKDIR /app

ENV CI=true \
    npm_config_fund=false \
    npm_config_audit=false

COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

ENV NODE_OPTIONS=--max-old-space-size=4096

RUN npm run build \
    && npm prune --omit=dev

# --- Runtime -----------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000

# Non-root user (fixed uid/gid for Kubernetes securityContext)
RUN groupadd --system --gid 10001 nodejs \
    && useradd --system --uid 10001 --gid nodejs nodejs

COPY --from=build --chown=10001:10001 /app/dist ./dist
COPY --from=build --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=build --chown=10001:10001 /app/package.json ./

USER nodejs

EXPOSE 4000

# Same path as package.json "serve:ssr:mcart-ui"
CMD ["node", "dist/mcart-ui/server/server.mjs"]
