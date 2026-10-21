# Production image shipped to clients (COTS): UI + API for exactly one client.
#
# The client's identity comes in as a named build context holding its instance.json (from the bundle,
# db/generate_client_schema.py). Only that one file is copied; the folder's other files (passwords,
# SQL) never enter the image. The modules built in are the ones its licence lists.
#
#   docker build \
#     --build-context instance=dist_client/Cust_00101 \
#     --build-arg BUILD_VERSION=1 \
#     -t cybertrustworks/vciso-platform:cust_00101-v1 .
#
# The image links itself to the client's database on first start (CTW_AUTO_LINK) and keeps link.json
# and evidence on the /data volume. Build context rules: Dockerfile.dockerignore.

# ---------- Client identity (must be supplied with --build-context instance=<bundle folder>) ----------
FROM scratch AS instance

FROM node:24-alpine AS identity
COPY --from=instance instance.json /instance/instance.json
# Fail the build here, with a reason, rather than ship an image that cannot start.
RUN node -e " \
  const i = require('/instance/instance.json'); \
  for (const k of ['instance_id', 'customer_id', 'license_id', 'license_seal', 'schema_version', 'licensed_modules']) \
    if (!i[k]) { console.error('instance.json has no ' + k); process.exit(1); } \
  require('fs').writeFileSync('/instance/modules', i.licensed_modules.join(',')); \
  console.log('Building for ' + i.customer_id + ' (instance ' + i.instance_id + '), modules: ' + i.licensed_modules.join(', '));"

# ---------- UI (vciso-platform/vciso-app) ----------
FROM node:24-alpine AS ui
WORKDIR /ui
COPY vciso-platform/vciso-app/package*.json ./
RUN npm ci
COPY vciso-platform/vciso-app/ ./
# A client build never runs in demo mode.
ENV VITE_SKIP_LOGIN=false
RUN npm run build

# ---------- API (src/ -> dist/, unlicensed modules removed, obfuscated) ----------
FROM node:24-alpine AS builder
WORKDIR /app
# All dependencies, including devDependencies (javascript-obfuscator lives there).
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY scripts/build.js ./scripts/build.js
COPY --from=identity /instance/modules /tmp/modules
ARG OBFUSCATE=true
RUN ENABLED_MODULES="$(cat /tmp/modules)" OBFUSCATE="$OBFUSCATE" npm run build

# Production-only dependencies, installed separately so no dev tooling leaks in.
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Production ----------
FROM node:24-alpine AS production

ARG BUILD_VERSION=dev
LABEL org.opencontainers.image.title="vciso-platform" \
      org.opencontainers.image.vendor="CyberTrustWorks" \
      com.cybertrustworks.build-version="${BUILD_VERSION}"

# tini reaps zombies and forwards SIGTERM so the server shuts down cleanly.
# /app/instance is made here so that COPY --chmod below sets the mode of the file only, not of the folder.
RUN apk add --no-cache tini && mkdir -p /data/evidence /app/instance && chown -R node:node /data

ENV NODE_ENV=production \
    PORT=4000 \
    CTW_INSTANCE_DIR=/app/instance \
    CTW_LINK_FILE=/data/link.json \
    CTW_EVIDENCE_DIR=/data/evidence \
    CTW_AUTO_LINK=true \
    UI_DIR=/app/ui
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder   --chown=node:node /app/dist ./dist
COPY --from=ui        --chown=node:node /ui/dist ./ui
# Owned by root and read-only to the app: the instance's identity cannot be edited from inside.
COPY --from=identity --chmod=444 /instance/instance.json ./instance/instance.json
COPY --chown=node:node package.json ./

# link.json (session and data keys) and uploaded evidence: back this volume up with the database.
VOLUME ["/data"]

# Built-in non-root user from the official image.
USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
