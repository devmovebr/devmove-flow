#!/usr/bin/env bash
# Copia framework/ para o workspace alvo sem sobrescrever arquivo existente.
# Uso: setup/lib/instalar.sh <workspace-alvo> [--valores <arquivo.md>] [--ui <pasta>]
# Preenche na cópia {{VERSAO}} e {{DATA}}.
# Com --valores, aplica os marcadores, gera os devs, as rules por serviço e os hooks (ver aplicar_valores.py).
# No fim registra o workspace na DevMove Flow UI (tools/devmove-ui.sh): a de --ui, senão ../devmove-flow-ui, instalada se não existir.
# Saída: uma linha por arquivo, "copiado" ou "existe" (quem decide o merge é o assistente), e a linha da UI.
set -euo pipefail
raiz="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "${1:?informe o workspace alvo}"
alvo="$(cd "$1" && pwd)"
shift
valores=""
ui=()
while [ $# -gt 0 ]; do
  case "$1" in
    --valores) valores="$(cd "$(dirname "${2:?informe o arquivo de valores}")" && pwd)/$(basename "$2")"; shift 2 ;;
    --ui) ui=(--ui "${2:?informe a pasta da UI}"); shift 2 ;;
    *) echo "argumento inválido: $1" >&2; exit 2 ;;
  esac
done
versao="$(cat "$raiz/VERSION")"
hoje="$(date +%F)"
cd "$raiz/framework"
find . -type f ! -name ".DS_Store" ! -path "*/__pycache__/*" | sort | while read -r f; do
  destino="$alvo/${f#./}"
  if [ -e "$destino" ]; then
    echo "existe  ${f#./}"
  else
    mkdir -p "$(dirname "$destino")"
    LC_ALL=C sed -e "s/{{VERSAO}}/$versao/g" -e "s/{{DATA}}/$hoje/g" "$f" > "$destino"
    [ -x "$f" ] && chmod +x "$destino"
    echo "copiado ${f#./}"
  fi
done

if [ -n "$valores" ]; then
  python3 "$raiz/setup/lib/aplicar_valores.py" "$alvo" "$valores"
fi

bash "$alvo/tools/devmove-ui.sh" registrar ${ui[@]+"${ui[@]}"} || echo "aviso UI não registrada: corrija e rode tools/devmove-ui.sh registrar"
