# Le Grand Pixel: one Node process (game server + static files). The database lives in /app/data (mount a volume there).
FROM node:24-slim
LABEL org.opencontainers.image.source="https://github.com/adriencre/Le-Grand-Pixel"

WORKDIR /app
ENV NODE_ENV=production PORT=4321

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js db.js ./
COPY games ./games
COPY public ./public

# Runs as an unprivileged user; /app/data must be writable by it (TrueNAS: the "apps" user, 568).
RUN mkdir -p /app/data && chown node:node /app/data
USER node
VOLUME /app/data
EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:' + process.env.PORT).then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# server.js saves everything on SIGTERM, so `docker stop` doesn't lose progress.
CMD ["node", "server.js"]
