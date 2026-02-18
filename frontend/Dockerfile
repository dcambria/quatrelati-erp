# =====================================================
# Frontend Dockerfile - Multi-stage Build (Next.js)
# v1.0.0 - Otimizado para produção
# =====================================================

# -----------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Instalar libc6-compat para compatibilidade
RUN apk add --no-cache libc6-compat

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# -----------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar dependências
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis de ambiente para build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Build da aplicação
RUN npm run build

# -----------------------------------------------------
# Stage 3: Production
# -----------------------------------------------------
FROM node:22-alpine AS production

WORKDIR /app

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Variáveis de ambiente
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiar arquivos públicos
COPY --from=builder /app/public ./public

# Copiar build standalone do Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Mudar para usuário não-root
USER nextjs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Comando de inicialização (standalone mode)
CMD ["node", "server.js"]

# -----------------------------------------------------
# Stage 4: Development (alternativa)
# -----------------------------------------------------
FROM node:22-alpine AS development

WORKDIR /app

# Instalar libc6-compat
RUN apk add --no-cache libc6-compat

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Comando de desenvolvimento
CMD ["npm", "run", "dev"]
