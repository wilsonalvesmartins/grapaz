# Estágio de Build
FROM node:18-alpine as build

WORKDIR /app

# Copia os arquivos de dependência primeiro para aproveitar o cache
COPY package*.json ./
RUN npm install

# Copia todo o resto do código
COPY . .

# Cria a versão de produção
RUN npm run build

# Estágio de Servidor (Nginx)
FROM nginx:alpine

# Copia os arquivos construídos para a pasta do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração necessária para React Router (SPA) funcionar bem no Nginx
# Cria um arquivo de config básico inline
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]