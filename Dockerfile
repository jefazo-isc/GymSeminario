# Etapa rápida para CI: reutiliza el artefacto dist/libreria1/browser ya compilado
FROM nginx:alpine AS prebuilt
COPY dist/libreria1/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Etapa 1 (build local completo): Compilar la aplicación de Angular 19
FROM node:22-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código fuente y compilar para producción
COPY . .
RUN npm run build -- --configuration production

# Etapa 2 (default): Servir los archivos estáticos con Nginx
FROM nginx:alpine AS runtime
COPY --from=build /app/dist/libreria1/browser /usr/share/nginx/html

# Exponer el puerto 80 dentro del contenedor
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
