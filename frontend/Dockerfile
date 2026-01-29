FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
RUN bun install

ENV NODE_ENV=development

WORKDIR /app/frontend
CMD ["bun", "dev", "--filter", "frontend", "--", "--host", "0.0.0.0", "--port", "5173"]
