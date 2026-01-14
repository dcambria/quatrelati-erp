# API Documentation - Quatrelati ERP

## Base URL
```
http://localhost:3001/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### POST /auth/login
Authenticate user and get tokens.

**Rate Limit:** 30 requests / 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "user": {
    "id": 1,
    "nome": "User Name",
    "email": "user@example.com",
    "nivel": "admin"
  },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}
```

### POST /auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

### POST /auth/logout
Logout user (requires auth).

### GET /auth/me
Get current user info (requires auth).

### PUT /auth/profile
Update current user profile (requires auth).

**Request Body:**
```json
{
  "nome": "New Name",
  "telefone": "+55 11 99999-9999"
}
```

### POST /auth/forgot-password
Request password reset via email.

**Rate Limit:** 5 requests / 1 hour

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /auth/verify-magic-link
Verify magic link token.

**Request Body:**
```json
{
  "token": "magic-link-token"
}
```

### PUT /auth/change-password
Change password (requires auth). Does not require current password.

**Request Body:**
```json
{
  "newPassword": "NewP@ssw0rd"
}
```

### PUT /auth/set-initial-password
Set initial password on first access (requires auth).

**Request Body:**
```json
{
  "password": "SecureP@ss1",
  "nome": "Updated Name"
}
```

### POST /auth/forgot-password-whatsapp
Request password reset via WhatsApp.

**Rate Limit:** 3 requests / 1 hour

**Request Body:**
```json
{
  "phone": "+55 11 99999-9999"
}
```

### POST /auth/verify-whatsapp-code
Verify WhatsApp code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

### POST /auth/reset-password
Reset password with token.

**Rate Limit:** 5 requests / 1 hour

**Request Body:**
```json
{
  "token": "reset-token",
  "newPassword": "NewP@ssw0rd"
}
```

---

## Pedidos Endpoints

### GET /pedidos
List orders with pagination and filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| mes | integer (1-12) | Filter by month |
| ano | integer | Filter by year |
| cliente_id | integer | Filter by client |
| produto_id | integer | Filter by product |
| status | string | `pendente`, `entregue`, `todos` |
| vendedor_id | integer | Filter by seller |
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 50, max: 100) |

**Response:**
```json
{
  "pedidos": [...],
  "total": 100,
  "page": 1,
  "totalPages": 2,
  "resumo": {
    "total_pedidos": 100,
    "total_caixas": 5000,
    "total_kg": 25000,
    "valor_total": 150000.00
  }
}
```

### GET /pedidos/:id
Get order by ID.

### POST /pedidos
Create new order.

**Request Body:**
```json
{
  "data_pedido": "2024-01-15",
  "cliente_id": 1,
  "data_entrega": "2024-01-20",
  "nf": "12345",
  "observacoes": "Notes",
  "horario_recebimento": "08:00 às 17:00",
  "preco_descarga_pallet": "50.00",
  "itens": [
    {
      "produto_id": 1,
      "quantidade_caixas": 100,
      "preco_unitario": 25.00
    }
  ]
}
```

### PUT /pedidos/:id
Update order.

### DELETE /pedidos/:id
Delete order (admin only).

### PATCH /pedidos/:id/entregar
Mark order as delivered.

### PATCH /pedidos/:id/reverter-entrega
Revert delivery status.

### GET /pedidos/exportar/pdf
Export orders to PDF.

**Query Parameters:** Same as GET /pedidos

### GET /pedidos/:id/pdf
Generate PDF for single order.

---

## Clientes Endpoints

### GET /clientes
List all clients.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by name |
| vendedor_id | integer | Filter by seller |

### GET /clientes/:id
Get client by ID.

### GET /clientes/:id/pedidos
Get client's orders.

### POST /clientes
Create new client.

**Request Body:**
```json
{
  "nome": "Client Name",
  "razao_social": "Company Name LTDA",
  "cnpj_cpf": "12.345.678/0001-00",
  "telefone": "+55 11 99999-9999",
  "email": "client@example.com",
  "endereco": "Street, 123",
  "cidade": "Sao Paulo",
  "estado": "SP",
  "cep": "01310-100",
  "observacoes": "Notes"
}
```

### PUT /clientes/:id
Update client.

### DELETE /clientes/:id
Delete client (admin only).

---

## Produtos Endpoints

### GET /produtos
List all products.

### GET /produtos/:id
Get product by ID.

### POST /produtos
Create new product (admin only).

**Request Body:**
```json
{
  "nome": "Product Name",
  "peso_caixa_kg": 5.0,
  "preco_padrao": 25.00,
  "descricao": "Description",
  "icone": "butter"
}
```

### PUT /produtos/:id
Update product (admin only).

### DELETE /produtos/:id
Delete product (admin only).

---

## Usuarios Endpoints

### GET /usuarios
List all users (superadmin only).

### GET /usuarios/:id
Get user by ID (superadmin only).

### POST /usuarios
Create new user (superadmin only).

**Request Body:**
```json
{
  "nome": "User Name",
  "email": "user@example.com",
  "telefone": "+55 11 99999-9999",
  "senha": "SecureP@ss1",
  "nivel": "vendedor"
}
```

**Niveles:** `superadmin`, `admin`, `vendedor`, `visualizador`

### PUT /usuarios/:id
Update user (superadmin only).

### DELETE /usuarios/:id
Delete/deactivate user (superadmin only).

### POST /usuarios/:id/invite
Resend invite email.

### POST /usuarios/invite
Send invite to new user.

---

## Dashboard Endpoints

### GET /dashboard/resumo
Get dashboard summary.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| mes | integer | Month |
| ano | integer | Year |
| vendedor_id | integer | Filter by seller |

### GET /dashboard/stats
Get general statistics.

### GET /dashboard/top-clientes
Get top clients by revenue.

### GET /dashboard/top-produtos
Get top products by quantity.

### GET /dashboard/evolucao
Get monthly evolution data.

### GET /dashboard/proximas-entregas
Get upcoming deliveries.

### GET /dashboard/entregas-atrasadas
Get late deliveries.

### GET /dashboard/empresa
Get company info.

### GET /dashboard/vendedores
List sellers.

---

## Configuracoes Endpoints

### GET /configuracoes
Get all settings.

### GET /configuracoes/:chave
Get setting by key.

### PUT /configuracoes/:chave
Update setting (superadmin only).

---

## Logs Endpoints

### GET /logs
Get activity logs (superadmin only).

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| usuario_id | integer | Filter by user |
| acao | string | Filter by action |
| entidade | string | Filter by entity |
| dias | integer | Days to look back (default: 30) |
| page | integer | Page number |
| limit | integer | Items per page |

### GET /logs/usuarios
Get users who have activity.

### GET /logs/acoes
Get action types.

### GET /logs/entidades
Get entity types.

### GET /logs/estatisticas
Get log statistics.

---

## Upload Endpoints

### POST /upload/image
Upload product image.

**Content-Type:** multipart/form-data

### POST /upload/logo
Upload company logo.

**Content-Type:** multipart/form-data

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": "Error message",
  "details": [
    {
      "field": "fieldName",
      "message": "Validation message"
    }
  ]
}
```

**Common HTTP Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

---

## Validation Rules

### CNPJ/CPF
- CPF: 11 digits with valid check digits
- CNPJ: 14 digits with valid check digits

### CEP
- Format: XXXXX-XXX or XXXXXXXX
- 8 digits

### Telefone
- 7-15 digits
- Accepts international format

### Senha Forte
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### Horario
- Format: HH:MM or HH:MM:SS
- Valid time (00:00 - 23:59)
