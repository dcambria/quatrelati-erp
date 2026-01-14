# Sistema de Gestao de Pedidos - Laticinio Quatrelati

Sistema completo de gestao de pedidos mensais para o Laticinio Quatrelati, empresa de laticinios especializada em manteigas, com 40+ anos no mercado lacteo.

## Producao

**URL:** https://erp.laticinioquatrelati.com.br

## Stack Tecnologica

### Frontend
- Next.js 15.5+ com App Router
- React 19+
- Tailwind CSS 3.4+ (Design System Liquid Glass)
- Lucide React (icones)
- React Hook Form + Zod (formularios)
- React Hot Toast (notificacoes)
- Recharts (graficos)
- date-fns (datas)
- next-pwa (PWA)

### Backend
- Node.js 22+ com Express 5
- PostgreSQL 15+
- JWT (autenticacao)
- bcryptjs (hash de senhas)
- PDFKit (exportacao PDF)
- AWS SES (envio de emails)

### Infraestrutura
- Docker + Docker Compose
- Nginx (reverse proxy)
- Cloudflare (CDN/WAF)
- AWS EC2 (Plesk)

## Inicio Rapido

### Pre-requisitos
- Docker e Docker Compose instalados
- Node.js 22+ (para desenvolvimento local)

### Executar com Docker (Recomendado)

```bash
# Clonar/entrar no diretorio
cd quatrelati

# Subir todos os servicos
docker-compose up -d

# Acessar
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

### Executar Localmente (Desenvolvimento)

```bash
# Subir apenas o banco de dados
docker-compose up -d postgres

# Backend
cd backend
npm install
npm run dev

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

## Credenciais de Acesso

As credenciais de acesso estao no arquivo `.env.local` (nao versionado).
Solicite ao administrador do sistema.

## Funcionalidades

### Dashboard
- Resumo mensal (pedidos, valor, peso)
- Grafico de status de entregas (pizza)
- Evolucao mensal (linha)
- Top 5 clientes e produtos
- Proximas entregas (7 dias)
- Entregas atrasadas

### Pedidos
- Listagem com navegacao mensal
- Filtros por status, cliente, produto
- Cadastro com calculo automatico de peso e total
- Numeracao automatica (YYMMXX)
- Marcar como entregue
- Exportacao PDF
- Impressao direta

### Clientes
- CRUD completo
- Historico de pedidos
- Estatisticas por cliente
- Visualizacao em Cards / Lista / Mapa
- Mapa Leaflet com clientes por cidade
- Criacao de rotas Google Maps (selecao multipla)
- Exportacao PDF da lista
- Ordenacao por todas as colunas
- Telefone e email clicaveis (tel: / mailto:)

### Produtos
- CRUD completo
- Estatisticas de vendas
- Peso por caixa configuravel

### Usuarios (apenas superadmin)
- CRUD de usuarios
- Niveis: superadmin, admin, vendedor, visualizador
- Convite por email (magic link)
- Ativar/desativar
- Indicador de forca de senha

### Perfil
- Edicao de nome e telefone
- Foto via Gravatar
- Alteracao de senha (sem exigir senha atual)

### Primeiro Acesso
- Modal de boas-vindas
- Definicao de senha obrigatoria
- Tour guiada pelo sistema

## API Endpoints

### Autenticacao
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/me` - Usuario atual
- `PUT /api/auth/profile` - Atualizar perfil
- `PUT /api/auth/change-password` - Alterar senha
- `POST /api/auth/verify-magic-link` - Verificar magic link
- `PUT /api/auth/set-initial-password` - Definir senha inicial

### Pedidos
- `GET /api/pedidos` - Listar (filtros: mes, ano, cliente_id, status)
- `GET /api/pedidos/:id` - Detalhes
- `POST /api/pedidos` - Criar
- `PUT /api/pedidos/:id` - Atualizar
- `DELETE /api/pedidos/:id` - Excluir
- `PATCH /api/pedidos/:id/entregar` - Marcar entregue
- `GET /api/pedidos/exportar/pdf` - Exportar PDF

### Clientes
- `GET /api/clientes` - Listar
- `GET /api/clientes/:id` - Detalhes
- `GET /api/clientes/:id/pedidos` - Historico
- `POST /api/clientes` - Criar
- `PUT /api/clientes/:id` - Atualizar
- `DELETE /api/clientes/:id` - Excluir

### Produtos
- `GET /api/produtos` - Listar
- `GET /api/produtos/:id` - Detalhes
- `POST /api/produtos` - Criar
- `PUT /api/produtos/:id` - Atualizar
- `DELETE /api/produtos/:id` - Excluir

### Usuarios
- `GET /api/usuarios` - Listar
- `GET /api/usuarios/:id` - Detalhes
- `POST /api/usuarios` - Criar
- `PUT /api/usuarios/:id` - Atualizar
- `DELETE /api/usuarios/:id` - Excluir
- `POST /api/usuarios/invite` - Enviar convite
- `POST /api/usuarios/:id/invite` - Reenviar convite

### Dashboard
- `GET /api/dashboard/resumo` - Resumo do mes
- `GET /api/dashboard/stats` - Estatisticas gerais
- `GET /api/dashboard/top-clientes` - Top clientes
- `GET /api/dashboard/top-produtos` - Top produtos
- `GET /api/dashboard/evolucao` - Evolucao mensal
- `GET /api/dashboard/proximas-entregas` - Proximas entregas
- `GET /api/dashboard/entregas-atrasadas` - Atrasadas

## Design System

O sistema utiliza o design "Liquid Glass" inspirado no Apple HIG 2024+, com:

- Efeitos de backdrop-blur e transparencia
- Cores da marca Quatrelati (dourado, azul, verde)
- Gradientes suaves
- Animacoes fluidas
- Suporte completo a dark mode

## Estrutura do Projeto

```
quatrelati/
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── magic-link/
│   │   ├── (dashboard)/
│   │   │   ├── pedidos/
│   │   │   ├── clientes/
│   │   │   ├── produtos/
│   │   │   ├── usuarios/
│   │   │   ├── perfil/
│   │   │   ├── atividades/
│   │   │   └── configuracoes/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── lib/
│   ├── tests/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── server.js
│   ├── tests/
│   └── package.json
├── db/
│   ├── init.sql
│   └── migrations/
├── docker-compose.yml
├── docker-compose.plesk.yml
└── README.md
```

## Testes E2E (Playwright)

Os testes E2E utilizam Playwright e requerem configuracao de credenciais via variaveis de ambiente.

### Configuracao

1. Crie o arquivo `frontend/.env.local`:
```bash
# Credenciais de teste (NUNCA commitar!)
TEST_BASE_URL=http://localhost:3000
TEST_USER_EMAIL=seu@email.com
TEST_USER_PASSWORD=suasenha
```

2. Execute os testes:
```bash
cd frontend

# Rodar todos os testes
npx playwright test

# Rodar com interface visual
npx playwright test --headed

# Rodar teste especifico
npx playwright test tests/clientes-debug.spec.js --headed
```

### Arquivos de Teste
- `tests/helpers.js` - Funcoes compartilhadas
- `tests/test-config.js` - Configuracao centralizada
- `tests/*.spec.js` - Testes E2E

> **Importante:** As credenciais sao carregadas do `.env.local` que esta no `.gitignore`. Nunca commite senhas no repositorio.

## Comandos Uteis

```bash
# Logs dos containers
docker-compose logs -f

# Reconstruir containers
docker-compose up -d --build

# Parar containers
docker-compose down

# Resetar banco de dados
docker-compose down -v
docker-compose up -d
```

## Licenca

**Software Proprietario** - Bureau de Tecnologia Ltda.

Este software e propriedade exclusiva do Bureau de Tecnologia Ltda. Todos os direitos reservados.
E expressamente proibida a copia, distribuicao, modificacao ou uso nao autorizado deste software.

---

Desenvolvido por [Bureau de Tecnologia](https://bureau-it.com)
