#!/bin/sh

# Ejecutar migraciones de Prisma al iniciar
echo "Verificando esquema de Prisma..."
if [ -f "./prisma/schema.prisma" ]; then
    echo "Esquema encontrado. Ejecutando migraciones..."
    npx prisma migrate deploy || { echo "Fallo al ejecutar migraciones"; exit 1; }
else
    echo "ERROR: No se encontró el archivo ./prisma/schema.prisma"
    exit 1
fi

# Iniciar la aplicación
echo "Iniciando servidor Next.js en puerto ${PORT:-3000}..."
node server.js
