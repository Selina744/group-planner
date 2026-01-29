# Group Trip Planner Backend

Express + TypeScript API server for the group trip planner application.

## Features

- 🚀 Express.js with TypeScript
- 🔒 Security middleware (Helmet, CORS, Rate Limiting)
- 📝 Request logging with Morgan
- 🗜️ Response compression
- ⚡ Fast development with Bun
- 🧪 Testing with Vitest + Supertest
- 🔧 Type-safe API with Zod validation
- 📊 Structured error handling

## Getting Started

1. Install dependencies:
   ```bash
   bun install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start development server:
   ```bash
   bun dev
   ```

4. Build for production:
   ```bash
   bun build
   ```

## Project Structure

```
src/
├── controllers/    # Request handlers
├── services/       # Business logic
├── middleware/     # Express middleware
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── app.ts          # Express app configuration
└── server.ts       # Server startup
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api` - API information

## Environment Variables

See `.env.example` for all available configuration options.

## Development

- The API runs on port 3000 by default
- Hot reload is enabled for development
- TypeScript checking happens during build
- Structured error handling with custom ApiError class

## Seeding demo data

1. Make sure `.env` contains a valid `DATABASE_URL` (the same variables listed above) and that the Postgres container/service is running.
2. From `backend/`, run `bun prisma db push` to materialize the latest Prisma schema.
3. Run `bun run seed` to create the host/co-host/member trio, the sample trip, five events, eight items (four recommended plus four shared with claims), notifications, and an announcement. All demo accounts share the password `GroupPlanner!2026`.
