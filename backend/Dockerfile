# FinFTech API - imagen de produccion
FROM node:24-alpine

WORKDIR /app

# Dependencias primero (mejor cache de capas)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Codigo fuente
COPY src ./src

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/finftech.db

# Volumen persistente para la base de datos SQLite
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
