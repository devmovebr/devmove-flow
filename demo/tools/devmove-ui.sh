#!/usr/bin/env bash
# Instala, registra e atualiza a DevMove Flow UI da máquina. A UI mora fora do workspace e serve todas as cópias registradas nela.
# Uso: tools/devmove-ui.sh <registrar|remover|atualizar|status> [--ui <pasta>]
# Pasta da UI: --ui, senão a lembrada em tools/.local/ui.txt, senão <pai do workspace>/devmove-flow-ui.
# Ambiente: DEVMOVE_UI_IMAGEM, DEVMOVE_UI_PORTA (4800), DEVMOVE_UI_PULL=0 usa a imagem local sem baixar.
set -euo pipefail
ws="$(cd "$(dirname "$0")/.." && pwd)"
cmd="${1:-}"
[ $# -gt 0 ] && shift
ui=""
while [ $# -gt 0 ]; do
  case "$1" in
    --ui) ui="${2:?informe a pasta da UI}"; shift 2 ;;
    *) echo "argumento inválido: $1" >&2; exit 2 ;;
  esac
done
lembrado="$ws/tools/.local/ui.txt"
[ -z "$ui" ] && [ -f "$lembrado" ] && ui="$(cat "$lembrado")"
[ -z "$ui" ] && ui="$(dirname "$ws")/devmove-flow-ui"
imagem="${DEVMOVE_UI_IMAGEM:-ghcr.io/devmovebr/devmove-flow-ui:latest}"
porta="${DEVMOVE_UI_PORTA:-4800}"
registro="$ui/projetos.txt"

compor() { docker compose --project-directory "$ui" -p devmove-flow-ui "$@"; }

checar_docker() {
  docker compose version >/dev/null 2>&1 || { echo "docker compose indisponível" >&2; exit 2; }
}

# Lado do host de um volume: no Git Bash, caminho do Windows (C:/...), que o Docker Desktop entende mesmo
# quando o bash o mostra por um ponto de montagem próprio, como /tmp.
hospedeiro() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else echo "$1"; fi; }

# QA e comando de token usam a rede do host (VPN, localhost dos serviços). No Docker Desktop (Windows e
# macOS) a rede do host vem desligada e a UI não responde na porta: avisa onde ligar.
checar_rede() {
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    curl -s -m 2 "http://localhost:$porta/api/info" 2>/dev/null | grep -q versao && return 0
    sleep 1
  done
  if [ "$(uname -s)" != "Linux" ]; then
    echo "aviso UI sem resposta em localhost:$porta: no Docker Desktop, Settings > Resources > Network > Enable host networking, Apply & restart e rode tools/devmove-ui.sh atualizar" >&2
  else
    echo "aviso UI sem resposta em localhost:$porta: docker logs devmove-flow-ui" >&2
  fi
}

projetos() { grep -v '^#' "$registro" 2>/dev/null | sed '/^[[:space:]]*$/d' || true; }

gerar() {
  cat > "$ui/docker-compose.yml" <<EOF
# Gerado por tools/devmove-ui.sh. Não editar.
services:
  painel:
    image: $imagem
    container_name: devmove-flow-ui
    network_mode: host
    restart: unless-stopped
    user: "$(id -u):$(id -g)"
    environment:
      PORT: "$porta"
      DEVMOVE_USUARIO: "$(id -un)"
      DEVMOVE_PROJETOS: /config/projetos.txt
    volumes:
      - "$(hospedeiro "$registro"):/config/projetos.txt:ro"
EOF
  projetos | while read -r p; do echo "      - \"$(hospedeiro "$p"):$p\""; done >> "$ui/docker-compose.yml"
}

baixar() {
  [ "${DEVMOVE_UI_PULL:-1}" = "0" ] && return 0
  compor pull -q 2>/dev/null && return 0
  echo "sem acesso a ${imagem%%/*}: rode 'gh auth token | docker login ghcr.io -u <usuario-github> --password-stdin' e repita" >&2
  exit 2
}

id_imagem() { docker image inspect -f '{{.Id}}' "$imagem" 2>/dev/null || true; }

versao() { docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.version"}}' "$imagem" 2>/dev/null || echo "?"; }

case "$cmd" in
  registrar)
    checar_docker
    mkdir -p "$ui" "$ws/tools/.local"
    ui="$(cd "$ui" && pwd)"; registro="$ui/projetos.txt"
    [ -f "$registro" ] || printf '# Projetos servidos pela DevMove Flow UI. Um caminho absoluto por linha.\n' > "$registro"
    nome="$(basename "$ws")"
    outro="$(projetos | grep -v "^$ws\$" | awk -F/ -v n="$nome" '$NF == n' | head -1 || true)"
    [ -n "$outro" ] && { echo "já existe projeto com o nome $nome: $outro" >&2; exit 2; }
    projetos | grep -qx "$ws" || echo "$ws" >> "$registro"
    echo "$ui" > "$lembrado"
    gerar
    baixar
    compor up -d --remove-orphans >/dev/null
    [ -x "$ws/tools/apps.sh" ] && "$ws/tools/apps.sh" inicializacao instalar || true
    checar_rede
    echo "registrado $nome em $ui · http://localhost:$porta/$nome/testes · versão $(versao)"
    ;;
  remover)
    checar_docker
    [ -f "$registro" ] || { echo "UI não encontrada em $ui" >&2; exit 2; }
    grep -vx "$ws" "$registro" > "$registro.tmp" || true
    mv "$registro.tmp" "$registro"
    rm -f "$lembrado"
    [ -x "$ws/tools/apps.sh" ] && "$ws/tools/apps.sh" inicializacao remover || true
    gerar
    compor up -d --remove-orphans >/dev/null
    echo "removido $(basename "$ws") de $ui"
    ;;
  atualizar)
    checar_docker
    [ -f "$registro" ] || { echo "UI não registrada (tools/devmove-ui.sh registrar)"; exit 0; }
    antes="$(id_imagem)"
    gerar
    baixar
    [ -x "$ws/tools/apps.sh" ] && "$ws/tools/apps.sh" inicializacao instalar >/dev/null || true
    if [ "$antes" = "$(id_imagem)" ] && docker ps --format '{{.Names}}' | grep -qx devmove-flow-ui; then
      echo "UI em dia $(versao)"
    else
      compor up -d --remove-orphans >/dev/null
      checar_rede
      echo "UI atualizada $(versao)"
    fi
    ;;
  status)
    estado="$(docker inspect -f '{{.State.Status}}' devmove-flow-ui 2>/dev/null || echo "parado")"
    echo "UI $ui · $estado · versão $(versao) · http://localhost:$porta"
    projetos | sed 's/^/  /'
    ;;
  *)
    echo "uso: tools/devmove-ui.sh <registrar|remover|atualizar|status> [--ui <pasta>]" >&2
    exit 2
    ;;
esac
