# Deployment Guide - Quatrelati ERP

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)
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

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@quatrelati.com

# WhatsApp/Twilio (optional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

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

### Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: quatrelati-postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - quatrelati-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: quatrelati-backend
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - quatrelati-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    container_name: quatrelati-frontend
    restart: always
    depends_on:
      - backend
    networks:
      - quatrelati-network

  nginx:
    image: nginx:alpine
    container_name: quatrelati-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - quatrelati-network

volumes:
  postgres_data:

networks:
  quatrelati-network:
    driver: bridge
```

### Production Dockerfiles

**backend/Dockerfile.prod:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER node
EXPOSE 3001
CMD ["node", "src/server.js"]
```

**frontend/Dockerfile.prod:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

### Nginx Configuration

**nginx/nginx.conf:**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:3001;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

## Database Management

### Backup

```bash
# Manual backup
docker exec quatrelati-postgres pg_dump -U quatrelati quatrelati > backup_$(date +%Y%m%d).sql

# Automated backup (cron)
0 2 * * * docker exec quatrelati-postgres pg_dump -U quatrelati quatrelati > /backups/quatrelati_$(date +\%Y\%m\%d).sql
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
# Run migrations
docker exec quatrelati-postgres psql -U quatrelati -d quatrelati -f /migrations/001_migration.sql
```

## Monitoring

### Health Checks

- Backend: `GET /api/health`
- Database: PostgreSQL healthcheck in compose

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 3
```

### Load Balancing

Configure Nginx upstream with multiple backend instances.

## SSL/TLS

### Let's Encrypt with Certbot

```bash
# Install certbot
apt-get install certbot python3-certbot-nginx

# Generate certificate
certbot --nginx -d yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

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

**Permission denied:**
```bash
# Fix volume permissions
sudo chown -R 1000:1000 ./data
```

### Reset Everything

```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

## Security Checklist

- [ ] Change default database password
- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS in production
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Monitor logs for suspicious activity
- [ ] Keep dependencies updated
- [ ] Use secrets management in production
