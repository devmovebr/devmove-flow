#!/usr/bin/env bash
# Runner dos planos de teste de QA. Gerado a partir de framework-ui/app (npm run build:cli).
# Uso: tools/qa.sh <validar|run|veredito|rodadas> <dossiê> [args]
set -euo pipefail
cd "$(dirname "$0")/.."
exec node --no-warnings=ExperimentalWarning tools/qa.mjs "$@"
