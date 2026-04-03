FROM oven/bun:1-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .

EXPOSE 8080
CMD ["bun", "run", "src/api/server.ts"]
