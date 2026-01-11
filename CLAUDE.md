# Sistema de Pedidos - Laticínio Quatrelati

## Agente de Desenvolvimento Contínuo

### Regras do Agente

#### O que FAZER
- Melhorar componentes existentes
- Corrigir bugs encontrados
- Otimizar performance
- Aplicar design system Liquid Glass consistentemente
- Adicionar testes
- Usar cores Quatrelati (gold, blue, green)
- Manter compatibilidade com dark mode

#### O que NÃO FAZER
- Criar novas páginas além das especificadas
- Mudar a stack tecnológica
- Remover funcionalidades existentes
- Ignorar dark mode
- Usar cores fora da paleta Quatrelati
- Criar fallbacks para scripts inexistentes

### Comandos Úteis

```bash
# Subir ambiente completo
docker-compose up -d

# Desenvolvimento frontend
cd frontend && npm run dev

# Desenvolvimento backend
cd backend && npm run dev

# Rodar testes
npm test

# Verificar código
npm run lint
```

### Padrões de Código

- Componentes funcionais com hooks
- Async/await para operações assíncronas
- Tratamento de erros com try/catch
- Comentários em português
- Variáveis e funções em inglês
- Estilo Liquid Glass em todos componentes
- Variáveis sempre entre aspas

### Paleta de Cores

```css
/* Quatrelati Gold - Primária */
--quatrelati-gold-500: #D4A017;

/* Quatrelati Blue - Secundária */
--quatrelati-blue-500: #3B82F6;

/* Quatrelati Green - Sucesso */
--quatrelati-green-500: #22C55E;

/* Cream - Background Light */
--cream-50: #FFFEF7;
```

### Estrutura de Arquivos

```
frontend/app/
├── (auth)/login/page.js       # Página de login
├── (dashboard)/
│   ├── layout.js              # Layout com sidebar
│   ├── page.js                # Dashboard principal
│   ├── pedidos/page.js        # CRUD de pedidos
│   ├── clientes/page.js       # CRUD de clientes
│   ├── produtos/page.js       # CRUD de produtos
│   └── usuarios/page.js       # CRUD de usuários (admin)
├── components/
│   ├── ui/                    # Componentes base
│   └── layout/                # Sidebar, Header
├── contexts/
│   ├── AuthContext.js         # Autenticação
│   └── ThemeContext.js        # Tema claro/escuro
└── lib/
    └── api.js                 # Cliente HTTP
```

### Níveis de Acesso

- **superadmin**: Acesso total, gerencia usuários
- **admin**: Acesso a pedidos, clientes e produtos
- **user**: Acesso apenas a pedidos

### Versionamento

Ao implementar melhorias significativas, atualizar a versão nos arquivos:
- `frontend/package.json`
- `backend/package.json`
- `README.md`

Seguir padrão SemVer: MAJOR.MINOR.PATCH
