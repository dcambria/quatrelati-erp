# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-02-17

### Added
- Módulo Contatos do Site: lista leads do formulário institucional no ERP
- Notificação automática por email para wilson@laticinioquatrelati.com.br ao receber novo contato
- Remetente de notificação: customercare@bit-bpo.com (AWS SES, domínio bit-bpo.com)
- Badge de contatos novos no menu lateral (atualiza a cada 60s)
- Integração site → ERP: formulário salva dados em `contatos_site` via API Key
- Backup automático diário (03:00) com retenção de 30 dias e rotação automática
- Script `/usr/local/bin/quatrelati-backup.sh` instalado no servidor EC2
- `site/.env.prod` criado no servidor com variáveis de ambiente de produção

### Fixed
- Container site sem variáveis de ambiente (ERP_API_URL, ERP_API_KEY, SES_FROM_EMAIL)
- Página /contatos exibia "0 contatos" por usar `data.contatos` ao invés de `res.data.contatos`
- Backend desatualizado (v1.2.0 sem rota /api/contatos): rebuild e redeploy

## [2.2.0] - 2026-01-14

### Added
- Tour guiada para novos usuarios apos primeiro acesso
- Indicador de forca de senha (PasswordStrength component)
- Protecao contra envio de emails para dominios de teste (@teste.local)
- Favicon Quatrelati

### Changed
- Perfil: botao "Alterar Senha" expande formulario (nao exige senha atual)
- EmailService v2.3.0: pula envio para emails de teste
- Perfil page v1.3.0: refatorado secao de senha

### Fixed
- Race condition no primeiro acesso (verificacao antes de fechar modal)
- Fluxo de primeiro acesso com tour guiada

## [2.1.0] - 2026-01-13

### Added
- Deploy em producao (Plesk/EC2)
- docker-compose.plesk.yml para deploy
- Integracao AWS SES para envio de emails
- Convite de usuarios por email (magic link)
- Modal de primeiro acesso com definicao de senha

### Changed
- EmailService usando IAM role ao inves de profile
- Backend dotenv movido para dependencies

### Security
- Magic link com token seguro (crypto.randomBytes)
- Expiracao de magic links em 24h

## [2.0.0] - 2026-01-12

### Added
- Complete input mask system for Brazilian formats:
  - CNPJ (XX.XXX.XXX/XXXX-XX)
  - CPF (XXX.XXX.XXX-XX)
  - CEP (XXXXX-XXX)
  - Telefone celular ((XX) XXXXX-XXXX)
  - Telefone fixo ((XX) XXXX-XXXX)
  - Horario (HH:MM and HH:MM as HH:MM)
  - Moeda (1.234,56)
  - Peso (1.234,567)
- Full API documentation (API.md)
- Architecture documentation (ARCHITECTURE.md)
- Database schema documentation (DATABASE.md)
- Deployment guide (DEPLOYMENT.md)
- Refactored pedidos/page.js into components:
  - ResumoPedidos
  - TabelaPedidos
  - PedidoFormModal
  - PdfExportModal
  - IconeProduto

### Security
- All security items completed:
  - Rate limiting on auth endpoints
  - SQL injection fix (make_interval)
  - JWT secret fail-fast
  - Database transactions for multi-item orders

### Changed
- validations.js v1.6.0 - Complete Brazilian mask implementation
- clientes/page.js v1.5.0 - CNPJ, CEP, Telefone masks
- PedidoFormModal.js v1.3.0 - Horario interval mask
- produtos/page.js v1.2.0 - Peso, Moeda BR format
- perfil/page.js v1.1.0 - Telefone BR mask

### Fixed
- Horario mask preserving separator during typing
- Brazilian number format conversion (1.234,56 to float)

## [1.5.0] - 2026-01-11

### Added
- PDF export for individual orders
- Print functionality for orders
- Order number format (YYMMXX)
- Multi-item orders support
- Activity logging middleware

### Changed
- Backend test coverage to 99.17%
- 405 passing tests

### Security
- Rate limiting middleware
- Input validation middleware
- SQL injection prevention

## [1.4.0] - 2026-01-10

### Added
- Dashboard with charts (Recharts)
- Top clients and products statistics
- Monthly evolution graph
- Upcoming deliveries
- Late deliveries alerts

### Changed
- Dark mode support
- Responsive design improvements

## [1.3.0] - 2026-01-09

### Added
- Magic link password recovery
- WhatsApp OTP recovery
- User invitation system
- Company logo upload
- Product image upload

### Changed
- Authentication flow improvements
- Token refresh mechanism

## [1.2.0] - 2026-01-08

### Added
- User management (superadmin)
- Access levels (superadmin, admin, user)
- Seller filter for orders
- Client assignment to sellers

### Security
- Role-based access control
- Permission checks on routes

## [1.1.0] - 2026-01-07

### Added
- Order filtering by status
- Order filtering by client
- Order filtering by date range
- PDF export with filters
- Excel export

### Changed
- Improved table pagination
- Better loading states

## [1.0.0] - 2026-01-05

### Added
- Initial release
- User authentication (JWT)
- Orders CRUD
- Clients CRUD
- Products CRUD
- Dashboard summary
- Docker deployment
- PostgreSQL database

---

## File Versions

| Component | Version | Description |
|-----------|---------|-------------|
| frontend/app/lib/validations.js | v1.6.0 | Brazilian masks |
| frontend/app/(dashboard)/pedidos/page.js | v2.0.0 | Refactored components |
| frontend/app/(dashboard)/pedidos/components/PedidoFormModal.js | v1.3.0 | Horario mask |
| frontend/app/(dashboard)/clientes/page.js | v1.5.0 | CNPJ/CEP/Tel masks |
| frontend/app/(dashboard)/produtos/page.js | v1.2.0 | Peso/Moeda masks |
| frontend/app/(dashboard)/perfil/page.js | v1.3.0 | Refatorado secao senha |
| frontend/app/(dashboard)/usuarios/page.js | v1.2.0 | Indicador forca senha |
| frontend/app/components/ui/PasswordStrength.js | v1.0.0 | Componente forca senha |
| backend/src/middleware/auth.js | v1.1.0 | JWT fail-fast |
| backend/src/middleware/rateLimit.js | v1.0.0 | Rate limiting |
| backend/src/middleware/validation.js | v1.2.0 | Input validation |
| backend/src/routes/logs.js | v1.1.0 | SQL injection fix |
| backend/src/routes/pedidos.js | v2.0.0 | DB transactions |
| backend/src/services/emailService.js | v2.3.0 | Skip test emails |

---

## Test Coverage

### Backend
- Statements: 99.17%
- Branches: 94.09%
- Functions: 100%
- Lines: 99.28%
- Total tests: 405

### Frontend (E2E)
- Login flow
- CRUD operations
- Mask validation
- PDF export
