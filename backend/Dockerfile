FROM oven/bun:latest

WORKDIR /app

# Copy workspace root files first (for better Docker layer caching)
COPY package.json bun.lock ./
COPY tsconfig.json ./

# Copy both workspace package.json and tsconfig files (required for workspace resolution)
COPY backend/package.json ./backend/
COPY backend/tsconfig.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies (this layer will be cached if package files don't change)
RUN bun install

# Copy the rest of backend source code
COPY backend/ ./backend/

ENV NODE_ENV=development

WORKDIR /app
CMD ["bun", "dev", "--filter", "@group-planner/backend", "--", "--host", "0.0.0.0", "--port", "4000"]
