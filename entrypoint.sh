#!/bin/sh

# Ejecutar migraciones de Prisma al iniciar
echo "Ejecutando migraciones de Prisma..."
npx prisma migrate deploy

# Iniciar la aplicación
echo "Iniciando servidor Next.js..."
node server.js
