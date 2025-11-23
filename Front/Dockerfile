# --- ETAPA 1: build con node v20
FROM node:20 AS build
# Establece el directorio de trabajo
WORKDIR /app
COPY package.json package-lock.json ./
# dependencias
RUN npm install
# Copia el resto del código fuente
COPY . .
# Construye la app
RUN npm run build


# --- ETAPA 2: Imagen de Nginx
FROM nginx:alpine
# Copia los archivos estáticos al directorio web de Nginx.
COPY --from=build /app/dist /usr/share/nginx/html
# Copia la configuración personalizada de Nginx para el proxy
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
# Escucha el puerto 80
EXPOSE 80

# Comando de Nginx para iniciar el servidor
CMD ["nginx", "-g", "daemon off;"]