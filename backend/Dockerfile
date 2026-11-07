# ---------- compilación ----------
FROM node:25-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts=false
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---------- ejecución (imagen mínima, usuario sin privilegios) ----------
FROM node:25-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache tini && addgroup -S lp && adduser -S lp -G lp
COPY --from=build --chown=lp:lp /app/node_modules ./node_modules
COPY --from=build --chown=lp:lp /app/dist ./dist
COPY --chown=lp:lp package.json ./
USER lp
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
