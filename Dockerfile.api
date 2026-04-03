FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

COPY . .

EXPOSE 8080
CMD ["bun", "run", "src/api/server.ts"]
