# Sistema de Pedidos - Laticínio Quatrelati

## Ambiente de Produção

**URL:** https://erp.laticinioquatrelati.com.br
**Servidor:** Plesk (EC2 AWS us-east-1)
**SSH:** `ssh cloud`
**Diretório:** `/var/www/vhosts/laticinioquatrelati.com.br/erp.laticinioquatrelati.com.br/`

---

## Stack de Produção

| Componente | Tecnologia |
|------------|------------|
| Containers | Docker Compose |
| Banco | PostgreSQL 15 Alpine |
| Backend | Node.js 22 + Express.js 5 |
| Frontend | Next.js 15 (standalone) |
| Proxy | Nginx (Plesk) |
| CDN/WAF | Cloudflare |
| Email | AWS SES |

---

## Comandos de Deploy

```bash
# Conectar ao servidor
ssh cloud

# Diretório do projeto
cd /var/www/vhosts/laticinioquatrelati.com.br/erp.laticinioquatrelati.com.br

# Ver logs
sudo docker compose -f docker-compose.plesk.yml --env-file .env.prod logs -f

# Rebuild e restart
sudo docker compose -f docker-compose.plesk.yml --env-file .env.prod build
sudo docker compose -f docker-compose.plesk.yml --env-file .env.prod up -d

# Backup do banco
sudo docker exec quatrelati-db pg_dump -U quatrelati quatrelati_pedidos > backup.sql
```

---

## AWS

- **IAM Role:** IAM_Plesk
- **SES Region:** us-east-1
- **Domínios verificados SES:** bit-bpo.com
- **Emails verificados:** daniel.cambria@bureau-it.com, noreply@bit-bpo.com

---

## Arquivos de Produção

- `docker-compose.plesk.yml` - Compose para deploy em Plesk
- `.env.prod` (no servidor) - Variáveis de ambiente de produção
- `/etc/nginx/conf.d/99-erp-quatrelati.conf` - Config nginx customizada

---

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
