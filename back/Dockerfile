FROM node:22-alpine
WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar modulos nativos
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
