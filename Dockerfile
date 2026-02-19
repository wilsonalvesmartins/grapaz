# Usa imagem oficial do Node.js
FROM node:18-alpine

# Define diretório de trabalho
WORKDIR /app

# Instala dependências de sistema necessárias para SQLite
RUN apk add --no-cache python3 make g++

# Cria a pasta de dados persistentes
RUN mkdir -p /app/data/uploads

# Copia e instala dependências do projeto
COPY package*.json ./
RUN npm install

# Copia todo o código fonte
COPY . .

# Constrói o Frontend (React)
RUN npm run build

# Define a pasta /app/data como um volume (importante para o Coolify saber que aqui ficam dados)
VOLUME ["/app/data"]

# Expõe a porta 80
EXPOSE 80

# Inicia o servidor do Painel
CMD ["node", "server.js"]
