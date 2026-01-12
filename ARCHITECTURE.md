# Architecture - Quatrelati ERP

## System Overview

```
                    ┌─────────────────────────────────────────────────────┐
                    │                    FRONTEND                         │
                    │              Next.js 15 + React 19                  │
                    │         Tailwind CSS (Liquid Glass Design)          │
                    │                Port: 3000                           │
                    └─────────────────────┬───────────────────────────────┘
                                          │
                                          │ HTTP/REST
                                          │ JWT Auth
                                          │
                    ┌─────────────────────▼───────────────────────────────┐
                    │                    BACKEND                          │
                    │               Node.js + Express                     │
                    │                  Port: 3001                         │
                    │                                                     │
                    │  ┌─────────────────────────────────────────────┐   │
                    │  │  Middleware Stack                           │   │
                    │  │  - CORS                                     │   │
                    │  │  - Rate Limiting                            │   │
                    │  │  - JWT Authentication                       │   │
                    │  │  - Input Validation                         │   │
                    │  │  - Activity Logging                         │   │
                    │  └─────────────────────────────────────────────┘   │
                    └─────────────────────┬───────────────────────────────┘
                                          │
                                          │ pg (node-postgres)
                                          │
                    ┌─────────────────────▼───────────────────────────────┐
                    │                   DATABASE                          │
                    │                PostgreSQL 15+                       │
                    │                  Port: 5432                         │
                    └─────────────────────────────────────────────────────┘
```

## Directory Structure

```
quatrelati/
├── frontend/                      # Next.js frontend application
│   ├── app/
│   │   ├── (auth)/               # Auth routes (login, magic-link)
│   │   │   └── login/
│   │   ├── (dashboard)/          # Protected dashboard routes
│   │   │   ├── page.js           # Dashboard home
│   │   │   ├── pedidos/          # Orders management
│   │   │   │   ├── page.js
│   │   │   │   ├── components/   # Extracted components
│   │   │   │   └── utils.js
│   │   │   ├── clientes/         # Clients management
│   │   │   ├── produtos/         # Products management
│   │   │   ├── usuarios/         # Users management
│   │   │   ├── perfil/           # User profile
│   │   │   └── configuracoes/    # System settings
│   │   ├── components/
│   │   │   ├── layout/           # Layout components
│   │   │   │   ├── Header.js
│   │   │   │   ├── Sidebar.js
│   │   │   │   └── Footer.js
│   │   │   └── ui/               # Reusable UI components
│   │   │       ├── Button.js
│   │   │       ├── Card.js
│   │   │       ├── Input.js
│   │   │       ├── Modal.js
│   │   │       └── ...
│   │   ├── contexts/             # React contexts
│   │   │   ├── AuthContext.js
│   │   │   ├── ThemeContext.js
│   │   │   └── VendedorFilterContext.js
│   │   └── lib/
│   │       ├── api.js            # Axios instance
│   │       └── validations.js    # Zod schemas + masks
│   ├── tests/                    # Playwright E2E tests
│   └── public/                   # Static assets
│
├── backend/                       # Express backend API
│   ├── src/
│   │   ├── server.js             # Express app entry
│   │   ├── routes/               # API routes
│   │   │   ├── auth.js           # Authentication
│   │   │   ├── pedidos.js        # Orders CRUD
│   │   │   ├── clientes.js       # Clients CRUD
│   │   │   ├── produtos.js       # Products CRUD
│   │   │   ├── usuarios.js       # Users CRUD
│   │   │   ├── dashboard.js      # Dashboard stats
│   │   │   ├── configuracoes.js  # Settings
│   │   │   ├── logs.js           # Activity logs
│   │   │   └── upload.js         # File uploads
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT verification
│   │   │   ├── validation.js     # Input validation
│   │   │   ├── rateLimit.js      # Rate limiting
│   │   │   └── activityLog.js    # Activity logging
│   │   ├── services/
│   │   │   └── emailService.js   # Email sending
│   │   └── utils/
│   │       └── seedPasswords.js  # Password hashing
│   └── tests/                    # Jest unit/integration tests
│       ├── unit/
│       └── integration/
│
├── db/
│   ├── init.sql                  # Initial schema + seeds
│   └── migrations/               # SQL migrations
│
└── docker-compose.yml            # Docker orchestration
```

## Authentication Flow

```
1. Login Request
   POST /api/auth/login { email, password }

2. Server validates credentials
   - Check email exists
   - Compare bcrypt hash
   - Generate JWT access token (15min)
   - Generate refresh token (7 days)
   - Store refresh token in DB

3. Client stores tokens
   - localStorage.accessToken
   - localStorage.refreshToken

4. API Requests
   Authorization: Bearer <accessToken>

5. Token Refresh (when 401)
   POST /api/auth/refresh { refreshToken }

6. Logout
   POST /api/auth/logout
   - Invalidate refresh token in DB
   - Clear localStorage
```

## Rate Limiting Strategy

| Endpoint | Limit | Window |
|----------|-------|--------|
| /auth/login | 30 | 15 min |
| /auth/forgot-password | 5 | 1 hour |
| /auth/forgot-password-whatsapp | 3 | 1 hour |
| /auth/verify-* | 10 | 15 min |
| /auth/reset-password | 5 | 1 hour |
| General API | 100 | 1 min |

## Security Measures

1. **Authentication**
   - JWT tokens with short expiration
   - Refresh token rotation
   - Password hashing with bcrypt (10 rounds)

2. **Input Validation**
   - express-validator on all endpoints
   - CPF/CNPJ validation
   - CEP/phone format validation
   - Strong password requirements

3. **Database**
   - Parameterized queries (no SQL injection)
   - Transaction support for multi-item operations

4. **Rate Limiting**
   - express-rate-limit
   - Per-IP and per-user limits

5. **Headers**
   - CORS configuration
   - Helmet.js security headers

## Data Flow

### Creating an Order

```
1. Frontend: PedidoFormModal submits form
   └── POST /api/pedidos

2. Backend: pedidoValidation middleware
   └── Validates required fields
   └── Validates date_entrega >= date_pedido

3. Backend: auth middleware
   └── Verifies JWT token
   └── Extracts user from token

4. Backend: Route handler
   └── BEGIN TRANSACTION
   └── Generate order number (YYMMXX)
   └── Insert pedido
   └── Insert pedido_itens (loop)
   └── COMMIT / ROLLBACK

5. Backend: activityLog middleware
   └── Log action to activity_logs

6. Frontend: Receives response
   └── Updates state
   └── Shows toast notification
```

## Performance Optimizations

1. **Database**
   - Indexes on frequently queried columns
   - Composite index for date filtering
   - Connection pooling via pg Pool

2. **Frontend**
   - React component extraction
   - Lazy loading of modals
   - Optimistic UI updates

3. **Backend**
   - Query result caching (in-memory)
   - Pagination on list endpoints
   - Gzip compression

## Deployment Topology

### Development
```
localhost:3000 → Next.js dev server
localhost:3001 → Express dev server
localhost:5432 → PostgreSQL (Docker)
```

### Production (Docker)
```
nginx:80 → frontend:3000 (Next.js)
         → backend:3001 (Express)
postgres:5432 (internal)
```

## External Services

| Service | Purpose | Required |
|---------|---------|----------|
| SMTP | Email sending | Optional |
| Twilio | WhatsApp OTP | Optional |
| S3/R2 | Image storage | Optional |

## Testing Strategy

### Frontend (Playwright)
- E2E tests for critical flows
- Login, CRUD operations
- PDF export

### Backend (Jest)
- Unit tests for validation functions
- Integration tests for all routes
- 99%+ code coverage

## Error Handling

### API Error Response Format
```json
{
  "error": "Human readable message",
  "details": [
    {
      "field": "fieldName",
      "message": "Validation error"
    }
  ]
}
```

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Validation error
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 429: Rate limited
- 500: Server error
