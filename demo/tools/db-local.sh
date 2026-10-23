#!/usr/bin/env bash
# Postgres local descartável da Consultto (127.0.0.1:55432). Único caminho dos agents até o banco local.
# Uso: tools/db-local.sh <up|seed|reset|sql <arquivo>>
set -euo pipefail
raiz="$(cd "$(dirname "$0")/.." && pwd)"
URL="postgres://consultto:consultto@127.0.0.1:55432/consultto_local"
case "${1:-}" in
  up) docker compose -f "$raiz/code/docker-compose.yml" up -d --wait postgres redis ;;
  seed) cd "$raiz/code/api" && DATABASE_URL="$URL" pnpm prisma db seed ;;
  reset) cd "$raiz/code/api" && DATABASE_URL="$URL" pnpm prisma migrate reset --force --skip-seed ;;
  sql)
    arq="${2:?informe o arquivo .sql}"
    case "$arq" in *.sql) ;; *) echo "só arquivo .sql" >&2; exit 2 ;; esac
    psql "$URL" -v ON_ERROR_STOP=1 -f "$arq" ;;
  *) echo "uso: tools/db-local.sh <up|seed|reset|sql <arquivo>>" >&2; exit 2 ;;
esac
