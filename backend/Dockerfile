# =====================================================
# Backend Dockerfile - Multi-stage Build
# v1.0.0 - Otimizado para produção
# =====================================================

# -----------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------
FROM node:18-alpine AS deps

WORKDIR /app

# Instalar dependências do sistema para compilação
RUN apk add --no-cache python3 make g++

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências (incluindo devDependencies para build)
RUN npm ci

# -----------------------------------------------------
# Stage 2: Builder (para produção)
# -----------------------------------------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar dependências
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remover devDependencies e arquivos desnecessários
RUN npm prune --production && \
    rm -rf tests coverage .env.* *.md

# -----------------------------------------------------
# Stage 3: Production
# -----------------------------------------------------
FROM node:18-alpine AS production

WORKDIR /app

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

# Copiar apenas arquivos necessários
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/src ./src
COPY --from=builder --chown=nodeuser:nodejs /app/package.json ./

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3001

# Mudar para usuário não-root
USER nodeuser

# Expor porta
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Comando de inicialização
CMD ["node", "src/index.js"]

# -----------------------------------------------------
# Stage 4: Development (alternativa)
# -----------------------------------------------------
FROM node:18-alpine AS development

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências
RUN npm install

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3001

# Comando de desenvolvimento
CMD ["npm", "run", "dev"]
