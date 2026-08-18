# syntax=docker/dockerfile:1

# --- build -------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies are installed from the lockfile alone so this layer stays cached
# until package.json or package-lock.json actually change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Produces dist/ (client) and dist-server/ (the proxy handler + its adapter).
RUN npm run build

# --- runtime -----------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# No node_modules in the final image: the server build bundles its only
# dependency, and server.mjs otherwise imports node: builtins alone. The runtime
# stage is therefore the Node base plus roughly a megabyte of assets.
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/server.mjs ./server.mjs

# node:alpine ships an unprivileged `node` user; nothing here needs root.
USER node

EXPOSE 8080

# API keys are supplied at run time, never baked into a layer. The server
# refuses to start without them, which is the behaviour wanted in a container.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
