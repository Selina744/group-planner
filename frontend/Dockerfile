FROM oven/bun:latest

WORKDIR /app

# Copy workspace root files (includes bun.lock for workspace)
COPY package.json bun.lock ./
COPY tsconfig.json ./

# Copy both workspace package.json files (required for workspace resolution)
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install all workspace dependencies from root
RUN bun install

# Copy frontend source code
COPY frontend/ ./frontend/

ENV NODE_ENV=development

WORKDIR /app
CMD ["bun", "dev", "--filter", "@group-planner/frontend", "--", "--host", "0.0.0.0", "--port", "5173"]
