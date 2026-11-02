FROM node:20-alpine
WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar módulos nativos como better-sqlite3 en Alpine
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
