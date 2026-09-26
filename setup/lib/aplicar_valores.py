#!/usr/bin/env python3
"""Aplica um arquivo de valores ao workspace instalado.

Uso: aplicar_valores.py <workspace> <valores.md>

Formato do arquivo de valores (seções em markdown):

  ## PROJETO
  Orçaí
  ## DESCRICAO
  SaaS de orçamentos para autônomos
  ## STACK node
  nome: TypeScript (Node 22, Fastify)
  teste_arquivo: pnpm vitest run <arquivo> 2>&1 | tail -40
  antes_de_devolver: Em `code/api/`: `pnpm build`, `pnpm test` e os comandos de aceite do briefing.
  ## HOOK
  */code/api/*.ts|cd "${f%%/src/*}" && pnpm exec eslint --fix "$f"

Cada `## CHAVE` simples substitui `{{CHAVE}}` em CLAUDE.md, .claude/ e doc/.
Cada `## STACK <id>` gera `.claude/agents/dev-<id>.md` a partir de `agents/dev.md`.
Cada linha de `## HOOK` vira um caso (padrão|comando) do hook PostToolUse de Write|Edit.
Depois de gerar os agents, `agents/dev.md` é removido.
Saída: arquivos alterados e marcadores que sobraram.
"""
import json, os, re, sys

ws, valores = sys.argv[1], sys.argv[2]
simples, stacks, hooks = {}, {}, []
atual = None
for linha in open(valores, encoding="utf-8").read().splitlines():
    m = re.match(r"^## (\S+)(?: (\S+))?\s*$", linha)
    if m:
        chave, arg = m.group(1), m.group(2)
        if chave == "STACK":
            atual = ("stack", arg); stacks[arg] = {}
        elif chave == "HOOK":
            atual = ("hook", None)
        else:
            atual = ("simples", chave); simples[chave] = []
        continue
    if atual is None or (linha.startswith("# ") and atual[0] == "hook"):
        continue
    tipo, nome = atual
    if tipo == "simples":
        simples[nome].append(linha)
    elif tipo == "stack" and ":" in linha:
        k, v = linha.split(":", 1); stacks[nome][k.strip()] = v.strip()
    elif tipo == "hook" and "|" in linha:
        hooks.append(linha.split("|", 1))
simples = {k: "\n".join(v).strip() for k, v in simples.items()}
# valor de uma linha entra no meio de frase: sem ponto final
simples = {k: (v.rstrip(".") if "\n" not in v else v) for k, v in simples.items()}

alvos = [os.path.join(ws, "CLAUDE.md")]
for base in (".claude", "doc"):
    for raiz, _, arqs in os.walk(os.path.join(ws, base)):
        alvos += [os.path.join(raiz, a) for a in arqs if a.endswith(".md")]
for p in alvos:
    if not os.path.exists(p) or p.endswith(os.path.join("agents", "dev.md")):
        continue
    s = open(p, encoding="utf-8").read(); o = s
    for k, v in simples.items():
        s = s.replace("{{%s}}" % k, v)
    if s != o:
        open(p, "w", encoding="utf-8").write(s); print("preenchido", os.path.relpath(p, ws))

modelo = os.path.join(ws, ".claude", "agents", "dev.md")
if stacks and os.path.exists(modelo):
    base = open(modelo, encoding="utf-8").read()
    for sid, campos in stacks.items():
        s = base.replace("{{STACK_ID}}", sid).replace("{{STACK_NOME}}", campos.get("nome", sid))
        s = s.replace("{{CMD_TESTE_ARQUIVO}}", campos.get("teste_arquivo", "{{CMD_TESTE_ARQUIVO}}"))
        s = s.replace("{{CMD_ANTES_DE_DEVOLVER}}", campos.get("antes_de_devolver", "{{CMD_ANTES_DE_DEVOLVER}}"))
        for k, v in simples.items():
            s = s.replace("{{%s}}" % k, v)
        destino = os.path.join(ws, ".claude", "agents", "dev-%s.md" % sid)
        open(destino, "w", encoding="utf-8").write(s); print("agent", os.path.relpath(destino, ws))
    os.remove(modelo); print("removido .claude/agents/dev.md")

if hooks:
    sp = os.path.join(ws, ".claude", "settings.json")
    cfg = json.load(open(sp, encoding="utf-8"))
    casos = " ".join('%s) %s >/dev/null 2>&1;;' % (pad.strip(), cmd.strip()) for pad, cmd in hooks)
    cmd = "f=$(jq -r '.tool_input.file_path // empty'); case \"$f\" in %s esac; exit 0" % casos
    cfg.setdefault("hooks", {})["PostToolUse"] = [{"matcher": "Write|Edit", "hooks": [{"type": "command", "timeout": 30, "command": cmd}]}]
    json.dump(cfg, open(sp, "w", encoding="utf-8"), indent=2, ensure_ascii=False); print("hook .claude/settings.json")

sobra = []
for raiz, _, arqs in os.walk(ws):
    topo = os.path.relpath(raiz, ws).split(os.sep)[0]
    if topo in ("code", ".git"):
        continue
    for a in arqs:
        p = os.path.join(raiz, a)
        if a.endswith((".md", ".json")) and os.path.relpath(p, ws).split(os.sep)[0] in ("CLAUDE.md", ".claude", "doc"):
            sobra += sorted(set(re.findall(r"\{\{[A-Z_]+\}\}", open(p, encoding="utf-8").read())))
print("sobrou", " ".join(sorted(set(sobra))) or "nada")
