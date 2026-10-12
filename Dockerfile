# Etapa 1: Compilar la aplicación de Angular 19
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar para producción
COPY . .
RUN npm run build -- --configuration production

# Etapa 2: Servir los archivos estáticos con Nginx
FROM nginx:alpine
COPY --from=build /app/dist/libreria1/browser /usr/share/nginx/html

# Exponer el puerto 80 dentro del contenedor
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
