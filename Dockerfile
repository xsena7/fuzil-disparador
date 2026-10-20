FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Painel + worker já empacotado em JavaScript (o worker não precisa mais do tsx traduzindo o código na hora)
RUN npm run build && npm run build:worker
ENV NODE_ENV=production
EXPOSE 3000
# Sem npx: ele deixa um processo do npm parado na memória o tempo todo
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && exec node node_modules/next/dist/bin/next start -p 3000"]
