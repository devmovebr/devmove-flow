#!/usr/bin/env bash
# Instala, atualiza e confere a ponte de agentes do Mission Control neste workspace, em .agents-bridge/.
# Uso: tools/ponte.sh instalar --escopo <key> [--amqp-url <url>] [--mc-url <url> --mc-key-id <id> --mc-key-secret <secret>]
#      tools/ponte.sh <atualizar|status|desinstalar>
# A URL AMQP (amqps://usuario:senha@host/vhost) também vem de PONTE_AMQP_URL; sem as duas, é pedida no terminal.
# Rodar instalar de novo é seguro: atualiza o clone e só preenche no .env o que foi informado.
set -euo pipefail
ws="$(cd "$(dirname "$0")/.." && pwd)"
repo="https://github.com/devmovebr/mission-control-agents-bridge.git"
ponte="$ws/.agents-bridge"
cmd="${1:-}"
[ $# -gt 0 ] && shift
escopo="" amqp="${PONTE_AMQP_URL:-}" mc_url="" mc_id="" mc_secret=""
while [ $# -gt 0 ]; do
  case "$1" in
    --escopo) escopo="${2:?informe a key do projeto}"; shift 2 ;;
    --amqp-url) amqp="${2:?informe a URL AMQP}"; shift 2 ;;
    --mc-url) mc_url="${2:?informe a URL do MC}"; shift 2 ;;
    --mc-key-id) mc_id="${2:?informe o keyId}"; shift 2 ;;
    --mc-key-secret) mc_secret="${2:?informe o secret}"; shift 2 ;;
    *) echo "argumento inválido: $1" >&2; exit 2 ;;
  esac
done

checar_node() {
  command -v git >/dev/null || { echo "git não encontrado" >&2; exit 2; }
  command -v node >/dev/null || { echo "Node ≥ 22.18 não encontrado (sem admin: zip do nodejs.org em pasta do usuário, ou fnm/nvm)" >&2; exit 2; }
  node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=18)?0:1)' \
    || { echo "Node $(node -v) abaixo de 22.18" >&2; exit 2; }
}

# Valor de uma chave do .env da ponte (vazio se ausente).
ler() { [ -f "$ponte/.env" ] && sed -n "s/^$1=//p" "$ponte/.env" | tail -1 | tr -d '\r' || true; }

# Grava a chave no .env sem tocar nas outras; valor vazio não sobrescreve o que já existe.
gravar() {
  local chave="$1" valor="$2"
  [ -z "$valor" ] && return 0
  node -e '
    const fs = require("fs"); const [arq, k, v] = process.argv.slice(1);
    const linhas = fs.readFileSync(arq, "utf8").replace(/^﻿/, "").split(/\r?\n/);
    const i = linhas.findIndex((l) => l.startsWith(k + "="));
    if (i >= 0) linhas[i] = k + "=" + v; else linhas.push(k + "=" + v);
    fs.writeFileSync(arq, linhas.join("\n"));
  ' "$ponte/.env" "$chave" "$valor"
}

pid_ponte() {
  local pid
  pid="$(cat "$ponte/data/bridge.pid" 2>/dev/null || true)"
  [ -n "$pid" ] && node -e 'try{process.kill(Number(process.argv[1]),0)}catch{process.exit(1)}' "$pid" 2>/dev/null && echo "$pid"
  return 0
}

case "$cmd" in
  instalar)
    checar_node
    if [ -d "$ponte/.git" ]; then
      git -C "$ponte" pull -q --ff-only
    else
      git clone -q "$repo" "$ponte"
    fi
    grep -qx '.agents-bridge/' "$ws/.gitignore" 2>/dev/null || echo '.agents-bridge/' >> "$ws/.gitignore"
    (cd "$ponte" && npm install --no-audit --no-fund --loglevel=error)
    [ -f "$ponte/.env" ] || cp "$ponte/.env.example" "$ponte/.env"
    # O DevMove Flow abre demanda com /demanda; [QA] e [CR] seguem para /qa e /revisar-pr.
    [ -f "$ponte/commands.local.json" ] || cat > "$ponte/commands.local.json" <<'EOF'
{
  "rules": [
    { "titlePrefix": "[QA]", "command": "/qa" },
    { "titlePrefix": "[CR]", "command": "/revisar-pr" },
    { "command": "/demanda" }
  ]
}
EOF
    gravar BRIDGE_SCOPE "$(echo "$escopo" | tr '[:upper:]' '[:lower:]')"
    if [ -z "$amqp" ] && [ -z "$(ler BRIDGE_AMQP_URL)" ] && [ -t 0 ]; then
      read -rsp "URL AMQP do CloudAMQP (amqps://...): " amqp; echo
    fi
    case "$amqp" in ""|amqps://*|amqp://*) ;; *) echo "URL AMQP deve começar com amqps://" >&2; exit 2 ;; esac
    gravar BRIDGE_AMQP_URL "$amqp"
    gravar BRIDGE_MC_URL "$mc_url"
    gravar BRIDGE_MC_KEY_ID "$mc_id"
    gravar BRIDGE_MC_KEY_SECRET "$mc_secret"
    faltando=""
    [ -n "$(ler BRIDGE_SCOPE)" ] || faltando="$faltando --escopo"
    [ -n "$(ler BRIDGE_AMQP_URL)" ] || faltando="$faltando --amqp-url"
    if [ -n "$faltando" ]; then
      echo "ponte clonada em $ponte, falta no .env:$faltando. Rode tools/ponte.sh instalar$faltando <valor>" >&2
      exit 2
    fi
    (cd "$ponte" && npm run -s instalar)
    echo "ponte instalada em $ponte · escopo $(ler BRIDGE_SCOPE)"
    echo "1ª vez nesta máquina: cd .agents-bridge && npm run claude, faça /login e aceite a confiança na pasta; depois tools/ponte.sh status"
    ;;
  atualizar)
    checar_node
    [ -d "$ponte/.git" ] || { echo "ponte não instalada (tools/ponte.sh instalar)" >&2; exit 2; }
    git -C "$ponte" pull -q --ff-only
    (cd "$ponte" && npm install --no-audit --no-fund --loglevel=error && npm run -s instalar)
    echo "ponte atualizada $(git -C "$ponte" log -1 --format='%h %s')"
    ;;
  status)
    [ -d "$ponte/.git" ] || { echo "ponte não instalada (tools/ponte.sh instalar)"; exit 1; }
    pid="$(pid_ponte)"
    # O log do serviço é data/bridge.log; a última linha do [bus] diz se a conexão está de pé.
    bus="$(grep -a '\[bus\]' "$ponte/data/bridge.log" 2>/dev/null | tail -1 || true)"
    versao="$(git -C "$ponte" log -1 --format='%h %cs')"
    if [ -z "$pid" ]; then
      echo "ponte parada · $versao · escopo $(ler BRIDGE_SCOPE)"
      echo "  subir: tools/ponte.sh atualizar (reinstala o serviço e sobe), ou em primeiro plano: cd .agents-bridge && npm start"
      exit 1
    fi
    case "$bus" in
      *conectado*) estado="conectada ao broker" ;;
      "") estado="sem log do serviço (rodando em primeiro plano?)" ;;
      *) estado="sem broker" ;;
    esac
    echo "ponte rodando · pid $pid · $estado · $versao · escopo $(ler BRIDGE_SCOPE)"
    [ -n "$bus" ] && echo "  $bus"
    case "$estado" in "sem broker") exit 1 ;; esac
    ;;
  desinstalar)
    [ -d "$ponte" ] || { echo "ponte não instalada"; exit 0; }
    (cd "$ponte" && npm run -s desinstalar)
    echo "serviço removido; o clone segue em $ponte (apague a pasta para zerar a ponte)"
    ;;
  *)
    echo "uso: tools/ponte.sh <instalar|atualizar|status|desinstalar> [--escopo <key>] [--amqp-url <url>]" >&2
    exit 2
    ;;
esac
