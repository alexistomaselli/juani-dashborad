# Stage 1: Install dependencies
FROM node:23-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# Stage 2: Build the app
FROM node:23-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generar el cliente de Prisma para que esté disponible en el build
ENV DATABASE_URL="file:./dev.db"
RUN npx prisma generate
RUN npm run build

# Stage 3: Production server
FROM node:23-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Instalar openssl para que Prisma funcione en slim
RUN apt-get update -y && apt-get install -y openssl

COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Script de inicio para ejecutar migraciones
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
