#!/usr/bin/env bash
# Imprime um token válido do ambiente pedido. Reusa o cache até 30 s antes de vencer.
# Uso: tools/token.sh <local|staging>
# Credenciais em tools/.local/credenciais.env (fora do git). Token nunca vai para arquivo de doc.
set -euo pipefail
amb="${1:?informe local ou staging}"
dir="$(cd "$(dirname "$0")" && pwd)/.local"
cache="$dir/token-$amb.txt"
if [ -f "$cache" ] && [ "$(date +%s)" -lt "$(( $(sed -n 's/^expira_em=//p' "$cache") - 30 ))" ]; then
  sed -n 's/^token=//p' "$cache"; exit 0
fi
set -a; . "$dir/credenciais.env"; set +a
case "$amb" in
  local) url="http://localhost:4000/auth/token" ;;
  staging) url="https://api.staging.consultto.app/auth/token" ;;
  *) echo "ambiente inválido: $amb" >&2; exit 2 ;;
esac
resp=$(curl -sS --fail -X POST "$url" -H 'Content-Type: application/json' \
  -d "$(jq -n --arg u "$QA_USUARIO" --arg p "$QA_SENHA" '{usuario:$u,senha:$p}')")
token=$(echo "$resp" | jq -r .access_token); exp=$(echo "$resp" | jq -r .expires_in)
umask 077; printf 'token=%s\nexpira_em=%s\n' "$token" "$(( $(date +%s) + exp ))" > "$cache"
echo "$token"
