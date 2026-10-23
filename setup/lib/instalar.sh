#!/usr/bin/env bash
# Copia framework/ para o workspace alvo sem sobrescrever arquivo existente.
# Uso: setup/lib/instalar.sh <workspace-alvo> [--valores <arquivo.md>]
# Preenche na cópia {{VERSAO}} e {{DATA}}.
# Com --valores, aplica os marcadores, gera os devs, as rules por serviço e os hooks (ver aplicar_valores.py).
# Saída: uma linha por arquivo, "copiado" ou "existe" (quem decide o merge é o assistente).
set -euo pipefail
raiz="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "${1:?informe o workspace alvo}"
alvo="$(cd "$1" && pwd)"
valores=""
[ "${2:-}" = "--valores" ] && valores="$(cd "$(dirname "${3:?informe o arquivo de valores}")" && pwd)/$(basename "$3")"
versao="$(cat "$raiz/VERSION")"
hoje="$(date +%F)"
cd "$raiz/framework"
find . -type f ! -name ".DS_Store" | sort | while read -r f; do
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
