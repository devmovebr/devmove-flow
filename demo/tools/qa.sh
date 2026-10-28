#!/usr/bin/env bash
# Runner dos planos de teste de QA. Gerado a partir de framework-ui/app (npm run build:cli).
# Uso: tools/qa.sh <validar|run|veredito|rodadas> <dossiê> [args]
# Roda dentro do container da DevMove Flow UI quando ele está de pé com este workspace montado: o banco
# .devmove/devmove.db fica com um lado só gravando (SQLite em WAL não é coerente entre host e container no
# Docker Desktop). Sem o container, usa o Node da máquina (>= 22.13).
set -euo pipefail
cd "$(dirname "$0")/.."
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx devmove-flow-ui \
  && MSYS_NO_PATHCONV=1 docker exec devmove-flow-ui test -f "$PWD/tools/qa.mjs" 2>/dev/null; then
  MSYS_NO_PATHCONV=1 exec docker exec -i -w "$PWD" devmove-flow-ui node --no-warnings=ExperimentalWarning tools/qa.mjs "$@"
fi
if node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)' 2>/dev/null; then
  exec node --no-warnings=ExperimentalWarning tools/qa.mjs "$@"
fi
echo "qa.sh precisa de Node >= 22.13 ou da DevMove Flow UI rodando (tools/devmove-ui.sh registrar)" >&2
exit 2
