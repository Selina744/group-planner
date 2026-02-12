# Production Deployment Guide

This document provides comprehensive instructions for deploying Group Planner to production using Docker Compose with Nginx reverse proxy.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Deployment](#deployment)
- [Operations](#operations)
- [Troubleshooting](#troubleshooting)
- [Security Checklist](#security-checklist)

## Architecture Overview

```
                    Internet
                        |
                   [Port 80/443]
                        |
                    +-------+
                    | Nginx |  (SSL termination, routing, rate limiting)
                    +-------+
                    /       \
            [/api/*]       [/*]
                |             |
          +-----+-----+  +----+----+
          | API (Bun) |  | Web     |
          | Port 3000 |  | Port    |
          +-----------+  | 3001    |
                |        +---------+
          +-----+-----+
          | PostgreSQL |
          | Port 5432  |
          +-----+------+
                |
          +-----+-----+
          |   Redis   |
          | Port 6379 |
          +-----------+
```

**Services:**

| Service    | Container               | Port     | Description                          |
|------------|-------------------------|----------|--------------------------------------|
| `nginx`    | nginx:1.25-alpine       | 80, 443  | Reverse proxy, SSL termination       |
| `api`      | group-planner-api       | 3000     | Bun-based Express API                |
| `web`      | group-planner-web       | 3001     | Nginx serving React static files     |
| `postgres` | postgres:16-alpine      | 5432     | PostgreSQL database                  |
| `redis`    | redis:7-alpine          | 6379     | Cache and session storage            |

## Prerequisites

1. **Docker Engine** 24.0+ with Compose V2
2. **Domain name** pointing to your server
3. **TLS certificates** (Let's Encrypt recommended)
4. **Server resources**: Minimum 2GB RAM, 2 vCPUs

### Required Files

```
group-planner/
├── docker-compose.prod.yml
├── .env.production              # Created from .env.production.example
├── backend/
│   └── Dockerfile.prod
├── frontend/
│   └── Dockerfile.prod
└── nginx/
    ├── nginx.conf
    ├── conf.d/
    │   └── default.conf
    └── certs/                   # TLS certificates
        ├── fullchain.pem
        ├── privkey.pem
        └── chain.pem
```

## Quick Start

```bash
# 1. Create production environment file
cp .env.production.example .env.production

# 2. Edit .env.production with secure values
# IMPORTANT: Generate real secrets!
# openssl rand -base64 64

# 3. Set up TLS certificates (see SSL/TLS Setup section)
mkdir -p nginx/certs
# Copy your certificates to nginx/certs/

# 4. Validate configuration
docker compose -f docker-compose.prod.yml config

# 5. Build and deploy
docker compose -f docker-compose.prod.yml up --build -d

# 6. Run database migrations
docker compose -f docker-compose.prod.yml exec api bun prisma migrate deploy

# 7. Verify deployment
docker compose -f docker-compose.prod.yml ps
curl -k https://localhost/health
```

## Configuration

### Environment Variables

Copy `.env.production.example` to `.env.production` and configure:

#### Critical Security Settings

| Variable          | Description                           | How to Generate                |
|-------------------|---------------------------------------|--------------------------------|
| `JWT_SECRET`      | JWT signing key (min 256 bits)        | `openssl rand -base64 64`      |
| `COOKIE_SECRET`   | Cookie signing key                    | `openssl rand -base64 64`      |
| `POSTGRES_PASSWORD` | Database password                   | `openssl rand -base64 32`      |

#### Application Settings

| Variable          | Description                           | Example                        |
|-------------------|---------------------------------------|--------------------------------|
| `APP_URL`         | Public application URL                | `https://app.example.com`      |
| `CORS_ORIGINS`    | Allowed CORS origins                  | `https://app.example.com`      |
| `SMTP_HOST`       | Email server hostname                 | `smtp.sendgrid.net`            |

### Nginx Configuration

The nginx configuration in `nginx/conf.d/default.conf` includes:

- **Rate limiting**: 100 req/s for API, 5 req/min for auth endpoints
- **Security headers**: HSTS, X-Frame-Options, CSP basics
- **Gzip compression**: Enabled for text-based content
- **WebSocket support**: For real-time features
- **Health checks**: `/health` endpoint for load balancers

## SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install certbot
apt install certbot

# Obtain certificate
certbot certonly --standalone -d yourdomain.com

# Copy certificates
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/certs/
cp /etc/letsencrypt/live/yourdomain.com/chain.pem nginx/certs/

# Set permissions
chmod 600 nginx/certs/*.pem
```

### Option 2: Self-Signed (Testing Only)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -subj "/CN=localhost"

# Create chain (same as fullchain for self-signed)
cp nginx/certs/fullchain.pem nginx/certs/chain.pem
```

### Certificate Renewal

Set up automatic renewal for Let's Encrypt:

```bash
# Add to crontab
0 0 1 * * certbot renew --quiet && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Deployment

### Initial Deployment

```bash
# Build images
docker compose -f docker-compose.prod.yml build

# Start services (database first)
docker compose -f docker-compose.prod.yml up -d postgres redis

# Wait for database to be ready
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U planner

# Start application services
docker compose -f docker-compose.prod.yml up -d api web nginx

# Run migrations
docker compose -f docker-compose.prod.yml exec api bun prisma migrate deploy
```

### Rolling Updates

```bash
# Pull latest code
git pull origin main

# Rebuild specific service
docker compose -f docker-compose.prod.yml build api

# Rolling restart (zero downtime)
docker compose -f docker-compose.prod.yml up -d --no-deps api

# Verify health
docker compose -f docker-compose.prod.yml exec api curl localhost:3000/api/v1/health
```

### Database Migrations

```bash
# Check migration status
docker compose -f docker-compose.prod.yml exec api bun prisma migrate status

# Apply pending migrations
docker compose -f docker-compose.prod.yml exec api bun prisma migrate deploy

# Rollback (if needed - requires manual intervention)
# Create a rollback migration in development first
```

## Operations

### Monitoring

```bash
# View all service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f api

# Check resource usage
docker stats
```

### Backup and Restore

```bash
# Backup database
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U planner groupplanner > backup_$(date +%Y%m%d).sql

# Restore database
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U planner groupplanner < backup_20240101.sql

# Backup volumes
docker run --rm -v group-planner-pgdata-prod:/data -v $(pwd):/backup \
  alpine tar czf /backup/pgdata_backup.tar.gz /data
```

### Scaling

For horizontal scaling, use Docker Swarm or Kubernetes. Basic multi-instance:

```bash
# Scale API service (requires load balancer configuration)
docker compose -f docker-compose.prod.yml up -d --scale api=3
```

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs api

# Check if ports are in use
lsof -i :3000
lsof -i :443
```

#### Database Connection Failed

```bash
# Verify postgres is healthy
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check DATABASE_URL in environment
docker compose -f docker-compose.prod.yml exec api env | grep DATABASE

# Test connection manually
docker compose -f docker-compose.prod.yml exec api \
  bun -e "const pg = require('pg'); const c = new pg.Client(process.env.DATABASE_URL); c.connect().then(() => console.log('OK')).catch(console.error)"
```

#### SSL Certificate Issues

```bash
# Verify certificate files exist
ls -la nginx/certs/

# Test certificate validity
openssl x509 -in nginx/certs/fullchain.pem -noout -dates

# Check nginx can read certificates
docker compose -f docker-compose.prod.yml exec nginx nginx -t
```

#### Memory Issues

```bash
# Check memory usage
docker stats --no-stream

# Adjust memory limits in docker-compose.prod.yml
# deploy.resources.limits.memory
```

### Health Checks

```bash
# Check all health endpoints
curl -s http://localhost/health                    # Nginx
curl -s http://localhost:3000/api/v1/health        # API (direct)
curl -s http://localhost:3001/health               # Frontend (direct)

# Via nginx
curl -sk https://localhost/health
curl -sk https://localhost/api/v1/health
```

## Security Checklist

Before going to production, verify:

- [ ] All secrets are unique and securely generated
- [ ] `.env.production` is NOT in version control
- [ ] TLS certificates are valid and from a trusted CA
- [ ] Database password is strong (32+ characters)
- [ ] JWT_SECRET is at least 256 bits
- [ ] CORS_ORIGINS is set to your domain only
- [ ] Rate limiting is configured
- [ ] Security headers are enabled
- [ ] Logs do not contain sensitive data
- [ ] Database backups are scheduled
- [ ] Firewall allows only ports 80 and 443
- [ ] SSH access uses key-based authentication
- [ ] Container images are from trusted sources
- [ ] Regular security updates are scheduled

## Resource Requirements

### Minimum (Development/Testing)

| Resource | Requirement |
|----------|-------------|
| CPU      | 2 vCPUs     |
| RAM      | 2 GB        |
| Disk     | 20 GB SSD   |

### Recommended (Production)

| Resource | Requirement |
|----------|-------------|
| CPU      | 4 vCPUs     |
| RAM      | 8 GB        |
| Disk     | 50 GB SSD   |

### Memory Allocation

| Service    | Limit  | Reservation |
|------------|--------|-------------|
| API        | 1 GB   | 256 MB      |
| Web        | 256 MB | 64 MB       |
| Nginx      | 128 MB | 32 MB       |
| PostgreSQL | 1 GB   | 256 MB      |
| Redis      | 512 MB | 64 MB       |
