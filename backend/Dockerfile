FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
RUN bun install

ENV NODE_ENV=development

WORKDIR /app/backend
CMD ["bun", "dev", "--filter", "backend", "--", "--host", "0.0.0.0", "--port", "4000"]
