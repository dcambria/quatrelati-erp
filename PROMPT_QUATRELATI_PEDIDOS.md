# 🧈 Sistema de Gestão de Pedidos - Laticínio Quatrelati

## Contexto do Projeto

Crie um sistema completo de gestão de pedidos para o Laticínio Quatrelati, empresa de laticínios especializada em manteigas. O sistema deve gerenciar pedidos mensais, clientes, produtos e usuários.

## Stack Tecnológica (OBRIGATÓRIA)

### Frontend
- **Next.js 16+** com App Router
- **React 19+**
- **Tailwind CSS 3.4+** com classes utilitárias
- **Lucide React** para ícones
- **React Hook Form + Zod** para formulários
- **React Hot Toast** para notificações
- **Recharts** para gráficos do dashboard
- **date-fns** para manipulação de datas

### Backend
- **Node.js 18+** com Express
- **PostgreSQL 15+** como banco de dados
- **JWT** para autenticação
- **bcryptjs** para hash de senhas

### Infraestrutura
- **Docker + Docker Compose** para containerização
- Ambiente de desenvolvimento local completo

---

## Estrutura do Projeto

```
quatrelati-pedidos/
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.js
│   │   ├── (dashboard)/
│   │   │   ├── layout.js
│   │   │   ├── page.js              # Dashboard principal
│   │   │   ├── pedidos/page.js      # Listagem/cadastro de pedidos
│   │   │   ├── clientes/page.js     # Gestão de clientes
│   │   │   ├── produtos/page.js     # Gestão de produtos
│   │   │   └── usuarios/page.js     # Gestão de usuários (admin)
│   │   ├── components/
│   │   │   ├── ui/                  # Componentes base (Button, Input, Card, etc)
│   │   │   ├── layout/              # Sidebar, Header, etc
│   │   │   ├── pedidos/             # Componentes específicos de pedidos
│   │   │   ├── dashboard/           # Cards e gráficos
│   │   │   └── common/              # Toast, Modal, Loading, etc
│   │   ├── contexts/
│   │   │   ├── AuthContext.js
│   │   │   └── ThemeContext.js
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   └── api.js               # Cliente API
│   │   ├── globals.css
│   │   └── layout.js
│   ├── package.json
│   ├── tailwind.config.js
│   ├── next.config.js
│   └── Dockerfile
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── pedidos.js
│   │   │   ├── clientes.js
│   │   │   ├── produtos.js
│   │   │   ├── usuarios.js
│   │   │   └── dashboard.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── validation.js
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   ├── package.json
│   └── Dockerfile
├── db/
│   ├── init.sql                     # Schema inicial + seeds
│   └── migrations/
├── docker-compose.yml
├── CLAUDE.md
├── TODO.md
└── README.md
```

---

## Funcionalidades Detalhadas

### 1. Autenticação
- Login com email e senha
- JWT com refresh token
- Proteção de rotas
- Níveis de acesso: `superadmin`, `admin`, `user`

### 2. Dashboard Principal
Cards obrigatórios:
- **Resumo do Mês**: Total de pedidos, valor total, peso total
- **Status de Entregas**: Pendentes vs Entregues (gráfico pizza)
- **Top 5 Clientes**: Por valor de pedidos
- **Top 5 Produtos**: Mais vendidos
- **Evolução Mensal**: Gráfico de linha (últimos 6 meses)
- **Pedidos Próximos**: Entregas nos próximos 7 dias
- **Taxa de Entrega**: % de pedidos entregues no prazo

### 3. Gestão de Pedidos
- Listagem com visualização mensal (navegação por mês/ano)
- Filtros: status (pendente/entregue), cliente, produto, período
- Cadastro de novo pedido com campos:
  - Data do pedido
  - Cliente (select com busca)
  - Número do pedido (auto-gerado: YYMMXX)
  - N.F. (opcional)
  - Data de entrega prevista
  - Produto (select)
  - Quantidade (caixas)
  - Peso (kg) - calculado automaticamente
  - Preço unitário (R$/kg)
  - Total (calculado)
  - Status: entregue (checkbox)
- Edição inline ou modal
- Marcar como entregue com data real
- **Exportação PDF** da listagem filtrada
- **Impressão** direta da listagem

### 4. Gestão de Clientes
- CRUD completo
- Campos: nome, CNPJ/CPF, telefone, email, endereço, observações
- Histórico de pedidos do cliente
- Status: ativo/inativo

### 5. Gestão de Produtos
- CRUD completo
- Campos: nome, descrição, peso por caixa (kg), preço padrão
- Status: ativo/inativo

### 6. Gestão de Usuários (apenas superadmin)
- CRUD de usuários
- Campos: nome, email, senha, nível de acesso
- Ativar/desativar usuário

---

## Design System (Apple HIG + Liquid Glass)

### Identidade Visual Quatrelati
- **Empresa**: Quatrelati Alimentos (Grupo Três Marias)
- **Localização**: Itapeva-SP
- **Slogan**: "Fabricando Manteiga para Indústria e Food Service"
- **40+ anos** no mercado lácteo

### Paleta de Cores Quatrelati
```css
/* Primária - Amarelo Dourado Quatrelati */
--quatrelati-gold-50: #FDF9E8;
--quatrelati-gold-100: #FCF3C7;
--quatrelati-gold-200: #F9E68A;
--quatrelati-gold-300: #F5D54E;
--quatrelati-gold-400: #E8C026;
--quatrelati-gold-500: #D4A017;  /* Cor principal do logo */
--quatrelati-gold-600: #B8860B;
--quatrelati-gold-700: #8B6914;

/* Secundária - Azul Quatrelati */
--quatrelati-blue-50: #EFF6FF;
--quatrelati-blue-100: #DBEAFE;
--quatrelati-blue-200: #BFDBFE;
--quatrelati-blue-400: #60A5FA;
--quatrelati-blue-500: #3B82F6;  /* Cor do banner */
--quatrelati-blue-600: #2563EB;
--quatrelati-blue-700: #1D4ED8;

/* Accent - Verde Folha (do logo) */
--quatrelati-green-400: #4ADE80;
--quatrelati-green-500: #22C55E;
--quatrelati-green-600: #16A34A;

/* Background - Creme Manteiga */
--cream-50: #FFFEF7;
--cream-100: #FDF6E3;
--cream-200: #F5EBCD;

/* Neutros */
--gray-50: #FAFAFA;
--gray-100: #F4F4F5;
--gray-200: #E4E4E7;
--gray-300: #D4D4D8;
--gray-400: #A1A1AA;
--gray-500: #71717A;
--gray-600: #52525B;
--gray-700: #3F3F46;
--gray-800: #27272A;
--gray-900: #18181B;

/* Status */
--success: #22C55E;
--warning: #D4A017;
--error: #EF4444;
--info: #3B82F6;
```

### Tailwind Config Customizado
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        quatrelati: {
          gold: {
            50: '#FDF9E8',
            100: '#FCF3C7',
            200: '#F9E68A',
            300: '#F5D54E',
            400: '#E8C026',
            500: '#D4A017',
            600: '#B8860B',
            700: '#8B6914',
          },
          blue: {
            50: '#EFF6FF',
            100: '#DBEAFE',
            200: '#BFDBFE',
            400: '#60A5FA',
            500: '#3B82F6',
            600: '#2563EB',
            700: '#1D4ED8',
          },
          green: {
            400: '#4ADE80',
            500: '#22C55E',
            600: '#16A34A',
          },
        },
        cream: {
          50: '#FFFEF7',
          100: '#FDF6E3',
          200: '#F5EBCD',
        },
      },
    },
  },
}
```

### Componentes Liquid Glass (Apple HIG 2024+)

```jsx
// ========================================
// LIQUID GLASS CARD - Componente Principal
// ========================================
<div className="
  relative overflow-hidden
  bg-white/60 dark:bg-gray-900/40
  backdrop-blur-2xl backdrop-saturate-200
  border border-white/20 dark:border-white/10
  rounded-3xl
  shadow-[0_8px_32px_rgba(0,0,0,0.08)]
  dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]
  p-6
  transition-all duration-300 ease-out
  hover:shadow-[0_16px_48px_rgba(212,160,23,0.15)]
  hover:border-quatrelati-gold-300/30
">
  {/* Gradiente interno sutil */}
  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/5 pointer-events-none" />
  
  {/* Conteúdo */}
  <div className="relative z-10">...</div>
</div>

// ========================================
// BOTÃO PRIMÁRIO - Gradiente Dourado
// ========================================
<button className="
  relative overflow-hidden
  px-6 py-3
  bg-gradient-to-r from-quatrelati-gold-500 via-quatrelati-gold-400 to-quatrelati-gold-500
  background-size: 200% 100%
  text-white font-semibold
  rounded-2xl
  shadow-lg shadow-quatrelati-gold-500/25
  transition-all duration-300 ease-out
  hover:shadow-xl hover:shadow-quatrelati-gold-500/30
  hover:scale-[1.02]
  active:scale-[0.98]
  disabled:opacity-50 disabled:cursor-not-allowed
">
  {/* Brilho superior */}
  <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
  <span className="relative">Texto do Botão</span>
</button>

// ========================================
// BOTÃO SECUNDÁRIO - Azul Liquid
// ========================================
<button className="
  px-6 py-3
  bg-quatrelati-blue-500/10 dark:bg-quatrelati-blue-500/20
  backdrop-blur-sm
  text-quatrelati-blue-600 dark:text-quatrelati-blue-400
  font-semibold
  rounded-2xl
  border border-quatrelati-blue-500/20
  transition-all duration-300
  hover:bg-quatrelati-blue-500/20
  hover:border-quatrelati-blue-500/30
  hover:scale-[1.02]
  active:scale-[0.98]
">

// ========================================
// INPUT LIQUID GLASS
// ========================================
<input className="
  w-full px-4 py-3.5
  bg-white/50 dark:bg-gray-800/50
  backdrop-blur-xl
  border border-gray-200/50 dark:border-gray-700/50
  rounded-2xl
  text-gray-900 dark:text-white
  placeholder:text-gray-400 dark:placeholder:text-gray-500
  transition-all duration-200
  focus:outline-none
  focus:ring-2 focus:ring-quatrelati-gold-500/50
  focus:border-quatrelati-gold-500/50
  focus:bg-white/70 dark:focus:bg-gray-800/70
  focus:shadow-lg focus:shadow-quatrelati-gold-500/10
" />

// ========================================
// SELECT COM ESTILO LIQUID
// ========================================
<select className="
  w-full px-4 py-3.5 pr-10
  bg-white/50 dark:bg-gray-800/50
  backdrop-blur-xl
  border border-gray-200/50 dark:border-gray-700/50
  rounded-2xl
  text-gray-900 dark:text-white
  appearance-none
  cursor-pointer
  transition-all duration-200
  focus:outline-none
  focus:ring-2 focus:ring-quatrelati-gold-500/50
  hover:bg-white/70 dark:hover:bg-gray-800/70
">

// ========================================
// BADGE DE STATUS
// ========================================
// Entregue
<span className="
  inline-flex items-center gap-1.5
  px-3 py-1.5
  bg-quatrelati-green-500/10 dark:bg-quatrelati-green-500/20
  text-quatrelati-green-600 dark:text-quatrelati-green-400
  text-sm font-medium
  rounded-full
  border border-quatrelati-green-500/20
">
  <span className="w-1.5 h-1.5 bg-quatrelati-green-500 rounded-full animate-pulse" />
  Entregue
</span>

// Pendente
<span className="
  inline-flex items-center gap-1.5
  px-3 py-1.5
  bg-quatrelati-gold-500/10 dark:bg-quatrelati-gold-500/20
  text-quatrelati-gold-600 dark:text-quatrelati-gold-400
  text-sm font-medium
  rounded-full
  border border-quatrelati-gold-500/20
">
  <span className="w-1.5 h-1.5 bg-quatrelati-gold-500 rounded-full" />
  Pendente
</span>

// ========================================
// SIDEBAR LIQUID GLASS
// ========================================
<aside className="
  fixed inset-y-0 left-0 w-72
  bg-white/70 dark:bg-gray-900/70
  backdrop-blur-2xl backdrop-saturate-150
  border-r border-white/20 dark:border-gray-800/50
  shadow-2xl shadow-black/5
">
  {/* Logo Quatrelati */}
  <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
    <img src="/logo-quatrelati.svg" alt="Quatrelati" className="h-12" />
  </div>
  
  {/* Menu Items */}
  <nav className="p-4 space-y-1">
    {/* Item ativo */}
    <a className="
      flex items-center gap-3 px-4 py-3
      bg-quatrelati-gold-500/15 dark:bg-quatrelati-gold-500/20
      text-quatrelati-gold-700 dark:text-quatrelati-gold-300
      rounded-xl font-medium
      border border-quatrelati-gold-500/20
    ">
    
    {/* Item inativo */}
    <a className="
      flex items-center gap-3 px-4 py-3
      text-gray-600 dark:text-gray-400
      rounded-xl
      transition-all duration-200
      hover:bg-gray-100/50 dark:hover:bg-gray-800/50
      hover:text-gray-900 dark:hover:text-white
    ">
  </nav>
</aside>

// ========================================
// HEADER LIQUID GLASS
// ========================================
<header className="
  sticky top-0 z-40
  bg-white/60 dark:bg-gray-900/60
  backdrop-blur-2xl backdrop-saturate-200
  border-b border-white/20 dark:border-gray-800/50
  px-6 py-4
">

// ========================================
// CARD DE ESTATÍSTICA (Dashboard)
// ========================================
<div className="
  relative overflow-hidden
  bg-gradient-to-br from-quatrelati-gold-500 to-quatrelati-gold-600
  rounded-3xl p-6
  shadow-xl shadow-quatrelati-gold-500/20
">
  {/* Padrão de fundo */}
  <div className="absolute inset-0 opacity-10">
    <svg className="w-full h-full" ...pattern>
  </div>
  
  {/* Brilho */}
  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
  
  <div className="relative z-10">
    <p className="text-quatrelati-gold-100 text-sm font-medium">Total de Pedidos</p>
    <p className="text-4xl font-bold text-white mt-2">53</p>
    <p className="text-quatrelati-gold-200 text-sm mt-1">+12% vs mês anterior</p>
  </div>
</div>

// ========================================
// TABELA LIQUID GLASS
// ========================================
<div className="
  bg-white/60 dark:bg-gray-900/40
  backdrop-blur-2xl
  rounded-3xl
  border border-white/20 dark:border-gray-800/50
  overflow-hidden
">
  <table className="w-full">
    <thead>
      <tr className="border-b border-gray-200/50 dark:border-gray-700/50">
        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
    </thead>
    <tbody className="divide-y divide-gray-200/30 dark:divide-gray-700/30">
      <tr className="hover:bg-quatrelati-gold-500/5 dark:hover:bg-quatrelati-gold-500/10 transition-colors">
        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
    </tbody>
  </table>
</div>

// ========================================
// MODAL LIQUID GLASS
// ========================================
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  {/* Overlay */}
  <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm" />
  
  {/* Modal */}
  <div className="
    relative w-full max-w-lg
    bg-white/80 dark:bg-gray-900/80
    backdrop-blur-2xl backdrop-saturate-200
    rounded-3xl
    border border-white/30 dark:border-gray-700/50
    shadow-2xl
    p-6
  ">
</div>
```

### Animações CSS Customizadas
```css
/* globals.css */

/* Animação de flutuação para elementos decorativos */
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
}

/* Brilho animado para botões premium */
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* Pulse suave para indicadores de status */
@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Gradiente animado para loading */
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-shimmer {
  background-size: 200% auto;
  animation: shimmer 3s linear infinite;
}

.animate-pulse-soft {
  animation: pulse-soft 2s ease-in-out infinite;
}

/* Skeleton com gradiente Quatrelati */
.skeleton-quatrelati {
  background: linear-gradient(
    90deg,
    rgba(212,160,23,0.1) 0%,
    rgba(212,160,23,0.2) 50%,
    rgba(212,160,23,0.1) 100%
  );
  background-size: 200% 100%;
  animation: gradient-shift 1.5s ease-in-out infinite;
}
```

### Padrões Obrigatórios Liquid Glass
- **Blur consistente**: `backdrop-blur-2xl` para elementos principais
- **Saturação**: `backdrop-saturate-150` ou `backdrop-saturate-200`
- **Transparência**: Backgrounds com `/60`, `/70`, `/80` de opacidade
- **Bordas sutis**: `border-white/20` light, `border-gray-800/50` dark
- **Sombras suaves**: Evitar sombras duras, preferir `/10`, `/20`
- **Gradientes internos**: Sempre adicionar `from-white/40` sutil
- **Cantos arredondados**: `rounded-2xl` mínimo, `rounded-3xl` preferencial
- **Transições**: `transition-all duration-300 ease-out`
- **Hover states**: Scale sutil `hover:scale-[1.02]`
- **Dark mode**: Sempre com variantes dark: completas
- **Cores Quatrelati**: Usar `quatrelati-gold` como primária, `quatrelati-blue` como accent

---

## Dados Iniciais (Seeds)

### Usuários
```sql
-- Superadmin
INSERT INTO usuarios (nome, email, senha_hash, nivel) VALUES 
('Daniel Cambria', 'daniel.cambria@bureau-it.com', '$2a$10$...', 'superadmin');

-- Admin
INSERT INTO usuarios (nome, email, senha_hash, nivel) VALUES 
('Wilson', 'wilson@laticinioquatrelati.com.br', '$2a$10$...', 'admin');

-- Senha padrão inicial: Quatrelati@2026
```

### Produtos (Manteigas)
```sql
INSERT INTO produtos (nome, descricao, peso_caixa_kg, preco_padrao, ativo) VALUES
('Manteiga Comum Sem Sal - Bloco 5kg', 'Manteiga comum sem sal, embalagem bloco 5kg', 5, 19.00, true),
('Manteiga Comum Sem Sal - Bloco 20kg', 'Manteiga comum sem sal, embalagem bloco 20kg', 20, 19.00, true),
('Manteiga de Primeira Qualidade Sem Sal - Bloco 5kg', 'Manteiga primeira qualidade sem sal, bloco 5kg', 5, 20.00, true),
('Manteiga de Primeira Qualidade Sem Sal - Bloco 20kg', 'Manteiga primeira qualidade sem sal, bloco 20kg', 20, 20.00, true),
('Manteiga Extra Sem Sal - Bloco 5kg', 'Manteiga extra sem sal, embalagem bloco 5kg', 5, 21.00, true),
('Manteiga Extra Sem Sal - Bloco 20kg', 'Manteiga extra sem sal, embalagem bloco 20kg', 20, 21.00, true),
('Manteiga - Pote 200g', 'Manteiga em pote, embalagem 200g', 0.2, 25.00, true),
('Manteiga - Pote 500g', 'Manteiga em pote, embalagem 500g', 0.5, 23.00, true);
```

### Clientes (extraídos da planilha)
```sql
INSERT INTO clientes (nome, ativo) VALUES
('GVINAH', true),
('DALLORA', true),
('RC FOODS', true),
('CASTELÃO', true),
('MR. BEY - MBF', true),
('MEGA G', true),
('ALLFOOD/YEMA', true),
('APETITO', true),
('MPA-PETITO', true),
('CARDAMONE', true),
('VINHAIS CARAPIC', true),
('VINHAIS JACOFER', true),
('VINHAIS PAULINIA', true),
('JCA FOODS', true),
('FERPEREZ', true),
('KING FOOD', true),
('WGC - AMERICAN BROWNIE', true),
('BIG ALIMENTOS', true),
('EMPORIO MEGA 100', true),
('STOQ ALIMENTOS', true),
('CANAA', true),
('FORMAGGIO', true),
('ME OLIV CALISSI - DFCQUEIJOS', true),
('DALLORA ENTREMINAS', true),
('APETITO FOODS', true);
```

### Pedidos (Janeiro/2026 - da planilha)
```sql
-- Importar todos os 37 pedidos da planilha
-- Exemplo de alguns pedidos iniciais
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-02', 1, '251241', NULL, '2026-01-10', 5, 1400, 7000, 19.00, 133000.00, false),
('2025-12-02', 1, '251242', NULL, '2026-02-01', 5, 1400, 7000, 19.00, 133000.00, false),
('2025-12-02', 2, '251243', NULL, '2026-01-10', 6, 400, 8000, 19.00, 152000.00, false);
-- ... continuar com todos os pedidos da planilha
```

---

## Schema do Banco de Dados

```sql
-- Usuários
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    nivel VARCHAR(20) DEFAULT 'user' CHECK (nivel IN ('superadmin', 'admin', 'user')),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cnpj_cpf VARCHAR(20),
    telefone VARCHAR(20),
    email VARCHAR(100),
    endereco TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Produtos
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    peso_caixa_kg DECIMAL(10,3) NOT NULL,
    preco_padrao DECIMAL(10,2),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    data_pedido DATE NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id),
    numero_pedido VARCHAR(20) UNIQUE NOT NULL,
    nf VARCHAR(20),
    data_entrega DATE,
    data_entrega_real DATE,
    produto_id INTEGER REFERENCES produtos(id),
    quantidade_caixas INTEGER NOT NULL,
    peso_kg DECIMAL(12,3) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    total DECIMAL(14,2) NOT NULL,
    entregue BOOLEAN DEFAULT false,
    observacoes TEXT,
    created_by INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_pedidos_data ON pedidos(data_pedido);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_entrega ON pedidos(data_entrega);
CREATE INDEX idx_pedidos_status ON pedidos(entregue);
CREATE INDEX idx_pedidos_mes ON pedidos(EXTRACT(YEAR FROM data_pedido), EXTRACT(MONTH FROM data_pedido));
```

---

## API Endpoints

### Autenticação
```
POST   /api/auth/login          - Login
POST   /api/auth/logout         - Logout
POST   /api/auth/refresh        - Refresh token
GET    /api/auth/me             - Usuário atual
```

### Pedidos
```
GET    /api/pedidos             - Listar (com filtros: mes, ano, cliente_id, status)
GET    /api/pedidos/:id         - Detalhes
POST   /api/pedidos             - Criar
PUT    /api/pedidos/:id         - Atualizar
DELETE /api/pedidos/:id         - Excluir
PATCH  /api/pedidos/:id/entregar - Marcar como entregue
GET    /api/pedidos/exportar/pdf - Exportar PDF
```

### Clientes
```
GET    /api/clientes            - Listar
GET    /api/clientes/:id        - Detalhes
POST   /api/clientes            - Criar
PUT    /api/clientes/:id        - Atualizar
DELETE /api/clientes/:id        - Excluir (soft delete)
GET    /api/clientes/:id/pedidos - Histórico de pedidos
```

### Produtos
```
GET    /api/produtos            - Listar
GET    /api/produtos/:id        - Detalhes
POST   /api/produtos            - Criar
PUT    /api/produtos/:id        - Atualizar
DELETE /api/produtos/:id        - Excluir (soft delete)
```

### Usuários (admin)
```
GET    /api/usuarios            - Listar
GET    /api/usuarios/:id        - Detalhes
POST   /api/usuarios            - Criar
PUT    /api/usuarios/:id        - Atualizar
DELETE /api/usuarios/:id        - Excluir (soft delete)
```

### Dashboard
```
GET    /api/dashboard/resumo    - Resumo do mês
GET    /api/dashboard/stats     - Estatísticas gerais
GET    /api/dashboard/top-clientes - Top clientes
GET    /api/dashboard/top-produtos - Top produtos
GET    /api/dashboard/evolucao  - Evolução mensal
GET    /api/dashboard/proximas-entregas - Próximas entregas
```

---

## Testes Obrigatórios

### Testes Unitários (Jest)
```
tests/
├── unit/
│   ├── services/
│   │   ├── pedidos.test.js
│   │   ├── clientes.test.js
│   │   └── auth.test.js
│   ├── utils/
│   │   ├── validators.test.js
│   │   └── formatters.test.js
│   └── components/
│       ├── PedidoForm.test.js
│       ├── ClienteCard.test.js
│       └── DashboardCard.test.js
```

### Testes de Integração
```
tests/
├── integration/
│   ├── api/
│   │   ├── auth.test.js
│   │   ├── pedidos.test.js
│   │   ├── clientes.test.js
│   │   └── produtos.test.js
│   └── database/
│       └── migrations.test.js
```

### Testes E2E (Playwright)
```
tests/
├── e2e/
│   ├── auth.spec.js           # Login/logout
│   ├── pedidos.spec.js        # CRUD pedidos
│   ├── clientes.spec.js       # CRUD clientes
│   ├── dashboard.spec.js      # Dashboard funcional
│   └── export.spec.js         # Exportação PDF
```

### Checklist de Qualidade
- [ ] 100% das rotas API com testes
- [ ] Cobertura mínima de 80%
- [ ] Zero erros de TypeScript/ESLint
- [ ] Todos os formulários com validação
- [ ] Tratamento de erros em todas as requisições
- [ ] Loading states em todas as operações
- [ ] Responsivo em mobile, tablet e desktop
- [ ] Dark mode funcionando em todas as telas
- [ ] Acessibilidade básica (labels, aria, keyboard nav)

---

## Arquivo CLAUDE.md (criar na raiz)

```markdown
# Sistema de Pedidos - Laticínio Quatrelati

## Agente de Desenvolvimento Contínuo

### Regras do Agente

#### O que FAZER
- Melhorar componentes existentes
- Corrigir bugs
- Otimizar performance
- Aplicar design system Liquid Glass consistentemente
- Adicionar testes
- Usar cores Quatrelati (gold, blue, green)

#### O que NÃO FAZER
- Criar novas páginas além das especificadas
- Mudar a stack tecnológica
- Remover funcionalidades existentes
- Ignorar dark mode
- Usar cores fora da paleta Quatrelati

### Comandos Úteis
- `npm run dev` - Inicia frontend
- `npm run dev:api` - Inicia backend
- `npm test` - Roda testes
- `npm run lint` - Verifica código
- `docker-compose up` - Sobe ambiente completo

### Padrões de Código
- Componentes funcionais com hooks
- Async/await para operações assíncronas
- Tratamento de erros com try/catch
- Comentários em português
- Variáveis e funções em inglês
- Estilo Liquid Glass em todos componentes
```

---

## Instruções de Execução

### Modo Loop de Qualidade

Após criar a estrutura inicial, entre em modo de melhoria contínua:

```
Entre em modo de desenvolvimento contínuo com validação rigorosa:

LOOP até estabilizar:
  1. Rode: npm run lint, npm run test, npm run build
  2. Se houver erros → corrija e volte ao passo 1
  3. Se passar tudo → analise o código buscando melhorias
  4. Se encontrar algo → corrija e volte ao passo 1
  5. Se não encontrar → incremente contador de "passes limpos"
  
PARE quando atingir 3 passes limpos consecutivos.

A cada ciclo, log resumido:
- Ciclo #N: [O que foi corrigido ou "limpo"]

Ao final, gere CHANGELOG.md com todas as alterações.
```

---

## Entregáveis Finais

1. ✅ Sistema funcionando com Docker Compose
2. ✅ Login funcional com os 2 usuários
3. ✅ Dashboard com todos os cards especificados
4. ✅ CRUD completo de pedidos, clientes, produtos, usuários
5. ✅ Visualização mensal de pedidos
6. ✅ Exportação PDF e impressão
7. ✅ Dados iniciais da planilha importados
8. ✅ Todos os testes passando
9. ✅ Zero erros de lint/build
10. ✅ README.md com instruções de setup
11. ✅ Design Liquid Glass com cores Quatrelati

---

## Início

Comece criando a estrutura de pastas e o docker-compose.yml, depois implemente na seguinte ordem:

1. **Infraestrutura**: Docker, PostgreSQL, schema inicial
2. **Backend**: Auth → Produtos → Clientes → Pedidos → Dashboard
3. **Frontend**: Auth → Layout → Dashboard → Pedidos → Clientes → Produtos → Usuários
4. **Testes**: Unitários → Integração → E2E
5. **Refinamento**: Loop de qualidade até estabilizar

Vamos começar! 🧈
