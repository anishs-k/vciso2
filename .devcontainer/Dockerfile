# Local development image. Not shipped to clients — see the root Dockerfile for that.
FROM node:24-bookworm

# Tools that are handy inside the dev container (psql for poking at the db).
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install dependencies in their own layer so they're cached between code changes.
COPY package*.json ./
RUN npm install

COPY . .

# The base image ships a non-root "node" user (uid 1000) — matches most host users.
RUN chown -R node:node /workspace
USER node

EXPOSE 4000
CMD ["npm", "run", "dev"]
