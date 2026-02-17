# Database Schema - Quatrelati ERP

## Overview

PostgreSQL 15+ database with the following structure.

## Tables

### usuarios
User accounts for the system.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| nome | VARCHAR(100) | User full name |
| email | VARCHAR(100) | Unique email address |
| senha_hash | VARCHAR(255) | Bcrypt password hash |
| nivel | VARCHAR(20) | Access level: `superadmin`, `admin`, `vendedor`, `visualizador` |
| ativo | BOOLEAN | Active status (default: true) |
| pode_visualizar_todos | BOOLEAN | Can view all orders (default: false) |
| primeiro_acesso | BOOLEAN | First access flag (default: true) |
| telefone | VARCHAR(20) | Phone number |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### clientes
Client/customer records.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| nome | VARCHAR(150) | Client name |
| razao_social | VARCHAR(200) | Legal company name |
| cnpj_cpf | VARCHAR(20) | CNPJ or CPF document |
| telefone | VARCHAR(20) | Phone number |
| email | VARCHAR(100) | Email address |
| endereco | TEXT | Street address |
| numero | VARCHAR(20) | Address number |
| complemento | VARCHAR(100) | Address complement |
| bairro | VARCHAR(100) | Neighborhood |
| cidade | VARCHAR(100) | City |
| estado | VARCHAR(2) | State code |
| cep | VARCHAR(10) | ZIP code |
| latitude | DECIMAL(10,8) | GPS latitude |
| longitude | DECIMAL(11,8) | GPS longitude |
| observacoes | TEXT | Notes |
| ativo | BOOLEAN | Active status |
| created_by | INTEGER | User who created |
| vendedor_id | INTEGER | Assigned seller |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### produtos
Product catalog.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| nome | VARCHAR(150) | Product name |
| descricao | TEXT | Description |
| peso_caixa_kg | DECIMAL(10,3) | Weight per box in kg |
| preco_padrao | DECIMAL(10,2) | Default price per kg |
| ativo | BOOLEAN | Active status |
| imagem_url | VARCHAR(500) | Product image URL |
| icone | VARCHAR(50) | Icon identifier |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### pedidos
Order records.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| data_pedido | DATE | Order date |
| cliente_id | INTEGER | FK to clientes |
| numero_pedido | VARCHAR(20) | Unique order number (YYMMXX) |
| nf | VARCHAR(20) | Invoice number |
| data_entrega | DATE | Expected delivery date |
| data_entrega_real | DATE | Actual delivery date |
| produto_id | INTEGER | FK to produtos (legacy) |
| quantidade_caixas | INTEGER | Number of boxes |
| peso_kg | DECIMAL(12,3) | Total weight in kg |
| preco_unitario | DECIMAL(10,2) | Price per kg |
| total | DECIMAL(14,2) | Total value |
| entregue | BOOLEAN | Delivery status |
| observacoes | TEXT | Notes |
| horario_recebimento | VARCHAR(50) | Receiving hours |
| preco_descarga_pallet | DECIMAL(10,2) | Pallet unloading price |
| created_by | INTEGER | FK to usuarios |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### pedido_itens
Order items (multi-product orders).

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| pedido_id | INTEGER | FK to pedidos |
| produto_id | INTEGER | FK to produtos |
| quantidade_caixas | INTEGER | Number of boxes |
| peso_kg | DECIMAL(12,3) | Weight in kg |
| preco_unitario | DECIMAL(10,2) | Price per kg |
| subtotal | DECIMAL(14,2) | Item subtotal |
| created_at | TIMESTAMP | Creation timestamp |

### refresh_tokens
JWT refresh token storage.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | FK to usuarios |
| token | VARCHAR(500) | Refresh token |
| expires_at | TIMESTAMP | Expiration time |
| created_at | TIMESTAMP | Creation timestamp |

### magic_links
Password reset and invitation magic links.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | FK to usuarios |
| token | VARCHAR(255) | Magic link token |
| expires_at | TIMESTAMP | Expiration time |
| used | BOOLEAN | Usage status |
| created_at | TIMESTAMP | Creation timestamp |

### activity_logs
User activity logging.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| usuario_id | INTEGER | FK to usuarios |
| usuario_nome | VARCHAR(100) | User name (denormalized) |
| usuario_nivel | VARCHAR(20) | User level (denormalized) |
| acao | VARCHAR(50) | Action type |
| entidade | VARCHAR(50) | Entity type |
| entidade_id | INTEGER | Entity ID |
| entidade_nome | VARCHAR(200) | Entity name |
| detalhes | JSONB | Additional details |
| ip_address | VARCHAR(45) | Client IP |
| user_agent | TEXT | Browser user agent |
| created_at | TIMESTAMP | Timestamp |

### error_logs
System error logging.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| error_type | VARCHAR(100) | Error type |
| message | TEXT | Error message |
| stack | TEXT | Stack trace |
| request_path | VARCHAR(255) | Request path |
| request_method | VARCHAR(10) | HTTP method |
| user_id | INTEGER | User ID (if authenticated) |
| ip_address | VARCHAR(45) | Client IP |
| user_agent | TEXT | Browser user agent |
| created_at | TIMESTAMP | Timestamp |

### configuracoes
System configuration key-value store.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| chave | VARCHAR(100) | Unique key |
| valor | TEXT | Value |
| descricao | TEXT | Description |
| updated_at | TIMESTAMP | Last update |

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_pedidos_data ON pedidos(data_pedido);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_entrega ON pedidos(data_entrega);
CREATE INDEX idx_pedidos_status ON pedidos(entregue);
CREATE INDEX idx_pedidos_mes ON pedidos(EXTRACT(YEAR FROM data_pedido), EXTRACT(MONTH FROM data_pedido));
CREATE INDEX idx_pedidos_numero ON pedidos(numero_pedido);
CREATE INDEX idx_clientes_nome ON clientes(nome);
CREATE INDEX idx_clientes_vendedor ON clientes(vendedor_id);
CREATE INDEX idx_produtos_nome ON produtos(nome);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_activity_logs_usuario ON activity_logs(usuario_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX idx_error_logs_created ON error_logs(created_at);
```

## Triggers

### update_updated_at_column()
Automatically updates `updated_at` timestamp on row updates.

Applied to tables:
- usuarios
- clientes
- produtos
- pedidos

## Relationships

```
usuarios
  |
  +-- clientes (created_by, vendedor_id)
  +-- pedidos (created_by)
  +-- refresh_tokens (user_id)
  +-- magic_links (user_id)
  +-- activity_logs (usuario_id)
  +-- error_logs (user_id)

clientes
  |
  +-- pedidos (cliente_id)

produtos
  |
  +-- pedidos (produto_id - legacy)
  +-- pedido_itens (produto_id)

pedidos
  |
  +-- pedido_itens (pedido_id)
```

## Migrations

Located in `/db/migrations/`:

| File | Description |
|------|-------------|
| 001_add_razao_social_and_entrega_fields.sql | Added razao_social to clientes, horario_recebimento to pedidos |
| 002_add_pode_visualizar_todos.sql | Added pode_visualizar_todos to usuarios |
| 003_add_missing_columns.sql | Added cidade, estado to clientes |
| 004_add_error_logs.sql | Added error_logs table |
| 005_add_endereco_completo_fields.sql | Added numero, complemento, bairro, latitude, longitude to clientes |
| 006_add_primeiro_acesso.sql | Added primeiro_acesso to usuarios |

## Backup

### Backup Automático (Produção)

Backup diário automático configurado via cron no servidor EC2:

| Item | Valor |
|------|-------|
| Script | `/usr/local/bin/quatrelati-backup.sh` |
| Horário | Todo dia às **03:00** (horário servidor) |
| Retenção | **30 dias** com rotação automática |
| Formato | `.sql.gz` (pg_dump comprimido com gzip) |
| Destino | `/var/www/vhosts/laticinioquatrelati.com.br/erp.laticinioquatrelati.com.br/backups/` |
| Log | `/var/log/quatrelati-backup.log` |

Entrada no crontab (`sudo crontab -l`):
```
0 3 * * * /usr/local/bin/quatrelati-backup.sh
```

### Comandos Manuais

```bash
# Backup manual (produção)
sudo docker exec quatrelati-db pg_dump -U quatrelati quatrelati_pedidos | gzip > backup-$(date +%Y%m%d).sql.gz

# Backup não comprimido (produção)
sudo docker exec quatrelati-db pg_dump -U quatrelati quatrelati_pedidos > backup.sql

# Backup (desenvolvimento)
docker exec quatrelati-postgres pg_dump -U quatrelati quatrelati > backup.sql

# Listar backups disponíveis
sudo ls -lah /var/www/vhosts/laticinioquatrelati.com.br/erp.laticinioquatrelati.com.br/backups/

# Ver log de backups
sudo cat /var/log/quatrelati-backup.log
```

### Restore

```bash
# Restore de backup comprimido (CUIDADO: apaga dados atuais)
# Consulte o usuário antes de executar!
gunzip -c backup-YYYYMMDD.sql.gz | sudo docker exec -i quatrelati-db psql -U quatrelati quatrelati_pedidos

# Restore não comprimido
sudo docker exec -i quatrelati-db psql -U quatrelati quatrelati_pedidos < backup.sql
```
