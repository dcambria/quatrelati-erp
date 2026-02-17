# =====================================================
# Quatrelati Site - Landing Page
# Node.js 22 Alpine
# =====================================================

FROM node:22-alpine AS production

WORKDIR /app

# Copiar package files e instalar dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar código fonte (excluindo node_modules via .dockerignore)
COPY . .

EXPOSE 3100

CMD ["node", "server.js"]
