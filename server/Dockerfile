# Etapa 1 (builder): Instala dependencias de producción (usa prebuild o compila si falta binario)
FROM node:22-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund || ( \
  apt-get update && \
  apt-get install -y --no-install-recommends python3 make g++ && \
  rm -rf /var/lib/apt/lists/* && \
  rm -rf node_modules && \
  npm ci --omit=dev --no-audit --no-fund \
)

# Etapa 2 (runtime): Imagen mínima sin herramientas de compilación
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY . .
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "index.js"]
