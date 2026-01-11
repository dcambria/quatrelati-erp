# Sistema de Gestão de Pedidos - Laticínio Quatrelati

Sistema completo de gestão de pedidos mensais para o Laticínio Quatrelati, empresa de laticínios especializada em manteigas, com 40+ anos no mercado lácteo.

## Stack Tecnológica

### Frontend
- Next.js 15+ com App Router
- React 19+
- Tailwind CSS 3.4+ (Design System Liquid Glass)
- Lucide React (ícones)
- React Hook Form + Zod (formulários)
- React Hot Toast (notificações)
- Recharts (gráficos)
- date-fns (datas)

### Backend
- Node.js 18+ com Express
- PostgreSQL 15+
- JWT (autenticação)
- bcryptjs (hash de senhas)
- PDFKit (exportação PDF)

### Infraestrutura
- Docker + Docker Compose

## Início Rápido

### Pré-requisitos
- Docker e Docker Compose instalados
- Node.js 18+ (para desenvolvimento local)

### Executar com Docker (Recomendado)

```bash
# Clonar/entrar no diretório
cd quatrelati

# Subir todos os serviços
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

### Super Administrador
- **Email:** daniel.cambria@bureau-it.com
- **Senha:** Quatrelati@2026

### Administrador
- **Email:** wilson@laticinioquatrelati.com.br
- **Senha:** Quatrelati@2026

## Funcionalidades

### Dashboard
- Resumo mensal (pedidos, valor, peso)
- Gráfico de status de entregas (pizza)
- Evolução mensal (linha)
- Top 5 clientes e produtos
- Próximas entregas (7 dias)
- Entregas atrasadas

### Pedidos
- Listagem com navegação mensal
- Filtros por status, cliente, produto
- Cadastro com cálculo automático de peso e total
- Numeração automática (YYMMXX)
- Marcar como entregue
- Exportação PDF
- Impressão direta

### Clientes
- CRUD completo
- Histórico de pedidos
- Estatísticas por cliente

### Produtos
- CRUD completo
- Estatísticas de vendas
- Peso por caixa configurável

### Usuários (apenas superadmin)
- CRUD de usuários
- Níveis: superadmin, admin, user
- Ativar/desativar

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/me` - Usuário atual

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
- `GET /api/clientes/:id/pedidos` - Histórico
- `POST /api/clientes` - Criar
- `PUT /api/clientes/:id` - Atualizar
- `DELETE /api/clientes/:id` - Excluir

### Produtos
- `GET /api/produtos` - Listar
- `GET /api/produtos/:id` - Detalhes
- `POST /api/produtos` - Criar
- `PUT /api/produtos/:id` - Atualizar
- `DELETE /api/produtos/:id` - Excluir

### Usuários
- `GET /api/usuarios` - Listar
- `GET /api/usuarios/:id` - Detalhes
- `POST /api/usuarios` - Criar
- `PUT /api/usuarios/:id` - Atualizar
- `DELETE /api/usuarios/:id` - Excluir

### Dashboard
- `GET /api/dashboard/resumo` - Resumo do mês
- `GET /api/dashboard/stats` - Estatísticas gerais
- `GET /api/dashboard/top-clientes` - Top clientes
- `GET /api/dashboard/top-produtos` - Top produtos
- `GET /api/dashboard/evolucao` - Evolução mensal
- `GET /api/dashboard/proximas-entregas` - Próximas entregas
- `GET /api/dashboard/entregas-atrasadas` - Atrasadas

## Design System

O sistema utiliza o design "Liquid Glass" inspirado no Apple HIG 2024+, com:

- Efeitos de backdrop-blur e transparência
- Cores da marca Quatrelati (dourado, azul, verde)
- Gradientes suaves
- Animações fluidas
- Suporte completo a dark mode

## Estrutura do Projeto

```
quatrelati/
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── pedidos/
│   │   │   ├── clientes/
│   │   │   ├── produtos/
│   │   │   └── usuarios/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── lib/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── server.js
│   └── package.json
├── db/
│   └── init.sql
├── docker-compose.yml
└── README.md
```

## Comandos Úteis

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

## Licença

Proprietário - Laticínio Quatrelati / Grupo Três Marias

---

**Quatrelati** - Fabricando Manteiga para Indústria e Food Service desde 1984
