# Deployment Guide - Quatrelati ERP

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 22+ (for local development)
- Git

## Quick Start (Development)

```bash
# Clone repository
git clone <repository-url>
cd quatrelati

# Start all services
docker-compose up -d

# Access
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
# Database: localhost:5432
```

## Environment Variables

### Backend (.env)

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://quatrelati:quatrelati2026@localhost:5432/quatrelati
DB_HOST=localhost
DB_PORT=5432
DB_USER=quatrelati
DB_PASSWORD=quatrelati2026
DB_NAME=quatrelati

# JWT
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS SES (production)
AWS_REGION=us-east-1
SES_FROM_EMAIL=noreply@bit-bpo.com

# Frontend URL (for magic links)
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Test credentials (for E2E tests)
TEST_BASE_URL=http://localhost:3000
TEST_USER_EMAIL=your@email.com
TEST_USER_PASSWORD=yourpassword
```

## Production Deployment (Plesk)

### Server Info

- **URL:** https://erp.laticinioquatrelati.com.br
- **Server:** AWS EC2 (Plesk)
- **SSH:** `ssh cloud`
- **Directory:** `/var/www/vhosts/laticinioquatrelati.com.br/erp.laticinioquatrelati.com.br/`

### Deploy Commands

```bash
# Connect to server
ssh cloud

# Navigate to project
cd /var/www/vhosts/laticinioquatrelati.com.br/erp.laticinioquatrelati.com.br

# View logs
sudo docker compose -f docker-compose.plesk.yml --env-file .env.prod logs -f

# Rebuild and restart
sudo docker compose -f docker-compose.plesk.yml --env-file .env.prod build --no-cache
sudo docker compose -f docker-compose.plesk.yml --env-file .env.prod up -d

# Rebuild specific service
sudo docker compose -f docker-compose.plesk.yml --env-file .env.prod build backend
sudo docker compose -f docker-compose.plesk.yml --env-file .env.prod up -d backend
```

### Production Files

| File | Description |
|------|-------------|
| `docker-compose.plesk.yml` | Docker Compose for Plesk deployment |
| `.env.prod` (on server) | Production environment variables |
| `/etc/nginx/conf.d/99-erp-quatrelati.conf` | Custom nginx configuration |

### AWS Configuration

| Service | Configuration |
|---------|---------------|
| IAM Role | IAM_Plesk |
| SES Region | us-east-1 |
| Verified Domains | bit-bpo.com |
| Verified Emails | daniel.cambria@bureau-it.com, noreply@bit-bpo.com |

## Docker Deployment

### Development

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Reset database
docker-compose down -v
docker-compose up -d
```

### Production Containers

| Container | Port | Description |
|-----------|------|-------------|
| quatrelati-db | 5432 (internal) | PostgreSQL 15 Alpine |
| quatrelati-backend | 3001 (internal) | Node.js 22 + Express |
| quatrelati-frontend | 3000 (internal) | Next.js 15 Standalone |

## Database Management

### Backup

```bash
# Production backup
sudo docker exec quatrelati-db pg_dump -U quatrelati quatrelati_pedidos > backup_$(date +%Y%m%d).sql

# Development backup
docker exec quatrelati-postgres pg_dump -U quatrelati quatrelati > backup.sql

# Automated backup (cron)
0 2 * * * sudo docker exec quatrelati-db pg_dump -U quatrelati quatrelati_pedidos > /backups/quatrelati_$(date +\%Y\%m\%d).sql
```

### Restore

```bash
# Stop backend
docker-compose stop backend

# Restore
docker exec -i quatrelati-postgres psql -U quatrelati quatrelati < backup.sql

# Restart backend
docker-compose start backend
```

### Migrations

```bash
# Run migrations (production)
sudo docker exec quatrelati-db psql -U quatrelati -d quatrelati_pedidos -f /migrations/006_add_primeiro_acesso.sql

# Run migrations (development)
psql -U quatrelati -d quatrelati -f db/migrations/006_add_primeiro_acesso.sql
```

## Monitoring

### Health Checks

All containers have built-in health checks:
- Backend: HTTP check on startup
- Database: `pg_isready` command
- Frontend: HTTP check on port 3000

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Production logs
sudo docker compose -f docker-compose.plesk.yml --env-file .env.prod logs -f --tail=100
```

## SSL/TLS

SSL is managed by Cloudflare:
- Full SSL mode enabled
- Automatic HTTPS redirect
- Edge certificates managed by Cloudflare

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -i :3000
kill -9 <PID>
```

**Database connection refused:**
```bash
# Check if postgres is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres
```

**Permission denied (production):**
```bash
# Use sudo for docker commands
sudo docker compose -f docker-compose.plesk.yml --env-file .env.prod logs
```

### Reset Everything

```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

## Security Checklist

- [x] Strong JWT_SECRET (32+ characters)
- [x] HTTPS enabled (Cloudflare)
- [x] Rate limiting on auth endpoints
- [x] SQL injection prevention (parameterized queries)
- [x] Password hashing (bcrypt)
- [x] Environment variables for secrets
- [ ] Regular database backups (cron)
- [ ] Log monitoring
