# Docker Development Environment

This document describes the Docker setup for the Group Planner application development environment.

## Quick Start

### Basic Development Setup
```bash
# Start core services (PostgreSQL + Redis)
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Full Development Environment
```bash
# Start all services including development tools
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Access development tools (see URLs below)
```

## Services

### Core Services (`docker-compose.yml`)

| Service | Port | Description | Dependencies |
|---------|------|-------------|--------------|
| `api` | 4000 | Backend Express app | postgres, redis |
| `web` | 5173 | Frontend Vite app | api |
| `postgres` | 5432 | PostgreSQL 16 database | - |
| `redis` | 6379 | Redis cache/sessions | - |

### Development Tools (`docker-compose.dev.yml`)

| Service | Port | Access | Credentials |
|---------|------|--------|-------------|
| `pgadmin` | 5050 | http://localhost:5050 | admin@groupplanner.dev / admin123 |
| `mailhog` | 8025 | http://localhost:8025 | No auth required |
| `redis-commander` | 8081 | http://localhost:8081 | admin / admin123 |
| `minio` | 9001 | http://localhost:9001 | admin / admin123456 |

## Environment Configuration

### Required Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://planner:planner@localhost:5432/groupplanner
POSTGRES_USER=planner
POSTGRES_PASSWORD=planner
POSTGRES_DB=groupplanner

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-256-bits

# Email (use MailHog for development)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_FROM_EMAIL=noreply@groupplanner.dev

# Application URLs
APP_URL=http://localhost:5173
API_URL=http://localhost:4000
```

## Common Commands

### Service Management
```bash
# Start all services
docker-compose up -d

# Start with development tools
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart api

# View service logs
docker-compose logs -f api
docker-compose logs -f postgres
```

### Development Workflow
```bash
# Pull latest images
docker-compose pull

# Rebuild services after code changes
docker-compose build api web

# Reset database (WARNING: destroys all data)
docker-compose down -v
docker-compose up -d postgres
```

### Database Operations
```bash
# Access PostgreSQL directly
docker-compose exec postgres psql -U planner -d groupplanner

# Run database migrations (once backend is set up)
docker-compose exec api bun run prisma:migrate

# Seed database (once seeder is created)
docker-compose exec api bun run db:seed
```

## File Structure

```
group-planner/
├── docker-compose.yml       # Core services
├── docker-compose.dev.yml   # Development tools
├── .env                     # Environment variables (create from .env.example)
├── backend/
│   ├── Dockerfile          # Backend container definition
│   └── ...
├── frontend/
│   ├── Dockerfile          # Frontend container definition
│   └── ...
└── database/
    └── init/               # Database initialization scripts
```

## Troubleshooting

### Port Conflicts
If you get port conflict errors:
```bash
# Check what's using the port
lsof -i :5432
sudo netstat -tulpn | grep :5432

# Kill the conflicting process or change ports in docker-compose.yml
```

### Permission Issues
```bash
# Fix volume permissions
sudo chown -R $USER:$USER ./data
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running and healthy
docker-compose exec postgres pg_isready -U planner

# Reset database volumes if corrupted
docker-compose down -v
docker-compose up -d postgres
```

### Container Build Issues
```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Development Tools Access

Once running with dev tools, access:

- **Application**: http://localhost:5173
- **API**: http://localhost:4000
- **Database Admin**: http://localhost:5050 (pgAdmin)
- **Email Testing**: http://localhost:8025 (MailHog)
- **Redis Management**: http://localhost:8081 (Redis Commander)
- **File Storage**: http://localhost:9001 (MinIO Console)

## Production Considerations

This setup is optimized for development. For production:

- Use production-grade databases (managed PostgreSQL/Redis)
- Implement proper secrets management
- Use reverse proxy (nginx/traefik)
- Enable SSL/TLS
- Configure monitoring and logging
- Use production Docker images (not development mounts)