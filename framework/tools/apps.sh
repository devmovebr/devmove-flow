#!/usr/bin/env bash
# Sobe e para as aplicações de code/ no host e atende o play da DevMove Flow UI. Gerado a partir de framework-ui/app (npm run build:cli).
# Uso: tools/apps.sh <listar|up|down|restart|logs|supervisor|ligar|desligar|repo> [args]
# Apps em tools/.local/apps.json (gerado pelo /apps). Roda sempre no host: a app precisa do JDK, Node e CLIs da máquina.
set -euo pipefail
cd "$(dirname "$0")/.."
# As apps sobem pelo mesmo bash que rodou este script (no Windows, o do Git, e não o do WSL).
if command -v cygpath >/dev/null 2>&1; then export DEVMOVE_BASH="$(cygpath -w "$BASH")"; else export DEVMOVE_BASH="$BASH"; fi
if node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)' 2>/dev/null; then
  exec node --no-warnings=ExperimentalWarning tools/apps.mjs "$@"
fi
echo "apps.sh precisa de Node >= 22.13 na máquina" >&2
exit 2
