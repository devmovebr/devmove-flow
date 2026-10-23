#!/usr/bin/env bash
# Clona em code/ os repositórios de tools/repos.txt; o que já existe recebe fetch.
# Uso: tools/clonar-repos.sh
set -euo pipefail
raiz="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$raiz/code"
falhas=()
while read -r pasta url; do
  case "$pasta" in ''|\#*) continue ;; esac
  destino="$raiz/code/$pasta"
  if [ -d "$destino/.git" ]; then
    echo "= $pasta: fetch"
    git -C "$destino" fetch --all --prune -q || falhas+=("$pasta")
  else
    echo "+ $pasta: clone"
    git clone -q "$url" "$destino" || falhas+=("$pasta")
  fi
done < "$raiz/tools/repos.txt"
[ ${#falhas[@]} -eq 0 ] || { echo "falharam: ${falhas[*]}" >&2; exit 1; }
echo "pronto"
