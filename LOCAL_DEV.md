# Local Development Setup

Quick guide to get the Group Planner application running locally with minimal setup.

---

## 🚀 Quick Start (Recommended)

**Fastest way to get running with minimal setup:**

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Start the database:**
   ```bash
   docker compose up -d postgres redis
   ```

3. **Set up the database schema:**
   ```bash
   cd backend
   bun install
   bunx prisma migrate dev
   bun run seed  # Optional: Add sample data
   ```

4. **Start the application:**
   ```bash
   # Terminal 1: Backend API
   cd backend && bun dev

   # Terminal 2: Frontend
   cd frontend && bun dev

   # OR start everything with Docker:
   docker compose up
   ```

5. **Access the application:**
   - Frontend: http://localhost:5173
   - API: http://localhost:4000
   - API Docs: http://localhost:4000/api/docs

---

## 📊 Database Options

### Option 1: Docker PostgreSQL (Recommended)

**Why choose this:** Production-like environment, easy cleanup, no system installation needed.

```bash
# Start PostgreSQL + Redis
docker compose up -d postgres redis

# Check it's running
docker ps
```

**Database Access:**
- Host: `localhost`
- Port: `5432`
- Database: `groupplanner`
- User: `planner`
- Password: `planner`

### Option 2: SQLite (Simplest)

**Why choose this:** Zero setup, single file, perfect for quick experimentation.

1. **Update Prisma schema:**
   ```prisma
   // In backend/prisma/schema.prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```

2. **Update .env:**
   ```bash
   DATABASE_URL="file:./backend/prisma/dev.db"
   ```

3. **Apply schema:**
   ```bash
   cd backend
   bunx prisma migrate reset
   bunx prisma migrate dev --name init
   ```

### Option 3: Local PostgreSQL Installation

**Why choose this:** System-wide database, persistent across reboots, familiar to PostgreSQL users.

**Install PostgreSQL:**
```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-16 postgresql-contrib

# Start the service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Create database:**
```bash
sudo -u postgres createuser --createdb $USER
createdb groupplanner
```

**Update .env:**
```bash
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/groupplanner"
```

### Option 4: Cloud Database (Minimal local setup)

**Why choose this:** No local database needed, shared team database, production-like.

**Free PostgreSQL options:**
- [Neon](https://neon.tech) - 500MB free
- [Supabase](https://supabase.com) - 500MB free
- [Railway](https://railway.app) - $5/month
- [PlanetScale](https://planetscale.com) - 10GB free (MySQL)

**Setup:**
1. Create a database on your chosen platform
2. Copy the connection string to your `.env`:
   ```bash
   DATABASE_URL="postgresql://user:pass@host:5432/dbname"
   ```

---

## 🛠 Development Tools

### Database Management

**pgAdmin (Web UI):**
```bash
# Start with development tools
docker compose -f docker compose.yml -f docker compose.dev.yml up -d

# Access at http://localhost:5050
# Email: admin@groupplanner.dev
# Password: admin123
```

**Direct CLI access:**
```bash
# Connect to Docker PostgreSQL
docker exec -it group-planner-postgres psql -U planner -d groupplanner

# Connect to local PostgreSQL
psql -d groupplanner

# Common commands:
\dt          # List tables
\d users     # Describe table
SELECT * FROM users LIMIT 5;
```

### Database Operations

**Reset database:**
```bash
cd backend
bunx prisma migrate reset
bunx prisma migrate dev
bun run seed  # Add sample data
```

**Generate Prisma client:**
```bash
bunx prisma generate
```

**View database in browser:**
```bash
bunx prisma studio  # Opens http://localhost:5555
```

---

## 🔧 Environment Configuration

### Minimal .env for local development

Create `.env` from `.env.example` and update these key values:

```bash
# Database - choose one option above
DATABASE_URL="postgresql://planner:planner@localhost:5432/groupplanner"

# Redis (for sessions)
REDIS_URL="redis://localhost:6379"

# JWT Secret (change this!)
JWT_SECRET="your-super-secret-development-key-here"

# Email (for local testing)
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_USER=""
SMTP_PASS=""

# Application URLs
APP_URL="http://localhost:5173"
API_URL="http://localhost:4000"
```

### Optional: MailHog for Email Testing

```bash
# Start MailHog for email testing
docker compose -f docker compose.yml -f docker compose.dev.yml up -d mailhog

# View emails at http://localhost:8025
```

---

## 🧪 Testing Setup

**Run tests with test database:**
```bash
cd backend

# Set test database URL
export DATABASE_URL="postgresql://planner:planner@localhost:5432/groupplanner_test"

# Create test database
createdb groupplanner_test  # or via Docker

# Run migrations on test DB
bunx prisma migrate deploy

# Run tests
bun test
```

---

## 🚨 Troubleshooting

### Docker Build Issues

**"bun install failed with exit code 1":**
This happens when Dockerfiles don't match the workspace structure. The fixed Dockerfiles should resolve this.

**"Workspace not found 'frontend' or 'backend'":**
This happens when the package names don't match the filter names. Our packages use scoped names:
- `@group-planner/backend`
- `@group-planner/frontend`

```bash
# Clean rebuild everything
docker compose down -v
docker compose build --no-cache
docker compose up -d postgres redis
```

**Alternative: Simplify package names (optional):**
If you prefer simple names, you can edit the `name` field in:
- `backend/package.json`: Change to `"name": "backend"`
- `frontend/package.json`: Change to `"name": "frontend"`

**"Command not found: docker compose":**
Use the new syntax:
```bash
# Old syntax (deprecated)
docker compose up

# New syntax (use this)
docker compose up
```

### Database Connection Issues

**"database does not exist":**
```bash
# For Docker PostgreSQL
docker compose down
docker compose up -d postgres
createdb -h localhost -U planner groupplanner

# For local PostgreSQL
createdb groupplanner
```

**"password authentication failed":**
- Check your `DATABASE_URL` in `.env`
- Verify PostgreSQL is running: `docker ps` or `brew services list`

**Port conflicts:**
```bash
# Check what's using port 5432
lsof -i :5432

# Use different port in docker compose.yml if needed
ports:
  - "5433:5432"  # Use 5433 instead
```

### Docker Compose Issues

**"Build failed" or cache issues:**
```bash
# Clean everything and rebuild
docker compose down -v  # Removes volumes too
docker system prune     # Clean up unused containers/images
docker compose build --no-cache
docker compose up
```

**"Volume mount issues on Windows":**
- Ensure Docker Desktop has file sharing enabled for your project directory
- Try using named volumes instead of bind mounts if file sync is slow

### Prisma Issues

**"Using engine type 'client' requires either 'adapter' or 'accelerateUrl'":**
This is a Prisma v7 configuration issue. Fixed by creating `prisma.config.ts`:
```bash
cd backend
bunx prisma generate  # Regenerate client with v7 config
```

**"Schema drift detected":**
```bash
bunx prisma migrate reset
bunx prisma migrate dev
```

**"Client not generated":**
```bash
bunx prisma generate
```

**Missing database connection:**
Ensure your `.env` file has:
```bash
DATABASE_URL="postgresql://planner:planner@localhost:5432/groupplanner"
```

### Performance Tips

**Speed up Docker on macOS:**
- Use `delegated` volume mounts (already configured)
- Allocate more CPU/Memory to Docker Desktop
- Consider using [Mutagen](https://mutagen.io/) for faster file sync

---

## 📁 Development Workflow

### Recommended workflow for database changes:

1. **Modify Prisma schema:**
   ```bash
   # Edit backend/prisma/schema.prisma
   ```

2. **Create migration:**
   ```bash
   bunx prisma migrate dev --name describe_your_change
   ```

3. **Update seed data if needed:**
   ```bash
   # Edit backend/prisma/seed.ts
   bun run seed
   ```

4. **Test your changes:**
   ```bash
   bun test
   ```

### Recommended workflow for new features:

1. **Start fresh session:**
   ```bash
   docker compose up -d postgres redis
   cd backend && bun dev
   cd frontend && bun dev
   ```

2. **Access development tools:**
   - API: http://localhost:4000/api/docs
   - Database: `bunx prisma studio`
   - Emails: http://localhost:8025 (if using MailHog)

3. **Clean shutdown:**
   ```bash
   docker compose down  # Stops but preserves data
   # or
   docker compose down -v  # Removes data too
   ```

---

## 🎯 Choose Your Setup

**For quick experimentation:** SQLite option
**For realistic development:** Docker PostgreSQL option
**For team sharing:** Cloud database option
**For PostgreSQL experts:** Local installation option

All options work with the same codebase - just change your `DATABASE_URL`!