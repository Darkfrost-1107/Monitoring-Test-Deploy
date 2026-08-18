#!/usr/bin/env bash
# Levanta el stack AISLADO para la suite e2e de navegador:
#   Postgres efímera :5433 + backend :3001 + frontend :5174.
# No toca la base de trabajo (:5432 / :3000 / :5173).
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOGS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.logs"
mkdir -p "$LOGS"
DB_URL="postgresql://admin:admin@localhost:5433/monitoring_e2e?schema=public"

echo "==> Postgres efímera (:5433)"
if ! docker ps --format '{{.Names}}' | grep -q '^monitoring-postgres-e2e$'; then
  docker rm -f monitoring-postgres-e2e >/dev/null 2>&1 || true
  docker run -d --name monitoring-postgres-e2e \
    -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=monitoring_e2e \
    -p 5433:5432 postgres:17 >/dev/null
fi
for _ in $(seq 1 30); do docker exec monitoring-postgres-e2e pg_isready -U admin -d monitoring_e2e >/dev/null 2>&1 && break; sleep 1; done

echo "==> Migraciones + seed"
( cd "$RAIZ/apps/backend" && DATABASE_URL="$DB_URL" pnpm exec prisma migrate deploy >/dev/null && DATABASE_URL="$DB_URL" pnpm exec prisma db seed >/dev/null )

echo "==> Backend de test (:3001)"
( cd "$RAIZ" && DATABASE_URL="$DB_URL" PORT=3001 FRONTEND_URL="http://localhost:5174" NODE_ENV=development \
  JWT_SECRET="dev-only-insecure-jwt-secret-replace-before-deploying-to-production" \
  JWT_REFRESH_SECRET="dev-only-insecure-refresh-secret-replace-before-deploying-to-production" \
  SMTP_HOST=127.0.0.1 SMTP_PORT=1025 \
  nohup pnpm --filter backend exec nest start > "$LOGS/backend.log" 2>&1 & echo $! > "$LOGS/backend.pid" )

echo "==> Frontend de test (:5174)"
( cd "$RAIZ" && VITE_API_URL="http://localhost:3001" \
  nohup pnpm --filter frontend exec vite --port 5174 --strictPort > "$LOGS/frontend.log" 2>&1 & echo $! > "$LOGS/frontend.pid" )

echo "==> Esperando a que respondan..."
for _ in $(seq 1 40); do curl -sf -o /dev/null "http://localhost:3001/api" 2>/dev/null; curl -sf -o /dev/null "http://localhost:5174/" && break; sleep 2; done
echo "Stack e2e listo: backend :3001, frontend :5174, DB :5433"
