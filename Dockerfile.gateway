FROM node:22-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install && npx playwright install --with-deps chromium

COPY . .

ENV NODE_ENV=production

CMD ["npx", "tsx", "src/gateway/index.ts", "run"]
