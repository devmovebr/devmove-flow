#!/usr/bin/env python3
"""Aplica um arquivo de valores ao workspace instalado.

Uso: aplicar_valores.py <workspace> <valores.md>

Formato do arquivo de valores (seções em markdown):

  ## PROJETO
  Orçaí
  ## STACK node
  apelido: allan
  nome: TypeScript (Node 22, Fastify)
  teste_arquivo: pnpm vitest run <arquivo> 2>&1 | tail -40
  antes_de_devolver: Em `code/api/`: `pnpm build`, `pnpm test` e os comandos de aceite do briefing.
  ## SERVICO api
  - Pasta: `code/api/`. Stack: node. Dev: `allan-dev-node`.
  - Comandos: ...
  ## HOOK
  */code/api/*.ts|cd "${f%%/src/*}" && pnpm exec eslint --fix "$f"
  ## MEM0
  nao

Cada `## CHAVE` simples substitui `{{CHAVE}}` em CLAUDE.md, .claude/, doc/ e tools/.
Cada `## STACK <id>` gera `.claude/agents/<apelido>-dev-<id>.md` a partir de `agents/dev.md`.
Cada `## SERVICO <nome>` gera `.claude/rules/code/servicos/<nome>.md` a partir de `servico.md`.
Cada linha de `## HOOK` vira um caso (padrão|comando) do hook PostToolUse de Write|Edit.
`## MEM0` com `nao` remove a skill `mem0`.
Depois de gerar, os modelos `agents/dev.md` e `rules/code/servicos/servico.md` são removidos.
Saída: arquivos alterados e marcadores que sobraram.
"""
import json, os, re, shutil, sys

APELIDOS = {"node": "allan", "next": "nora", "python": "sam", "go": "greg", "java": "jack",
            "devops": "dora", "rn": "rafa", "dotnet": "dani", "php": "pedro", "ruby": "ruth"}
RESERVA = ["lara", "bruno", "mia", "leo", "zoe", "hugo", "ivy", "max"]

ws, valores = sys.argv[1], sys.argv[2]
simples, stacks, servicos, hooks = {}, {}, {}, []
atual = None
for linha in open(valores, encoding="utf-8").read().splitlines():
    m = re.match(r"^## (\S+)(?: (\S+))?\s*$", linha)
    if m:
        chave, arg = m.group(1), m.group(2)
        if chave == "STACK":
            atual = ("stack", arg); stacks[arg] = {}
        elif chave == "SERVICO":
            atual = ("servico", arg); servicos[arg] = []
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
    elif tipo == "servico":
        servicos[nome].append(linha)
    elif tipo == "stack" and ":" in linha:
        k, v = linha.split(":", 1); stacks[nome][k.strip()] = v.strip()
    elif tipo == "hook" and "|" in linha:
        hooks.append(linha.split("|", 1))
simples = {k: "\n".join(v).strip() for k, v in simples.items()}
# valor de uma linha entra no meio de frase: sem ponto final
simples = {k: (v.rstrip(".") if "\n" not in v else v) for k, v in simples.items()}
mem0 = simples.pop("MEM0", "sim").strip().lower()


def preencher(s):
    for k, v in simples.items():
        s = s.replace("{{%s}}" % k, v)
    return s


modelos = (os.path.join("agents", "dev.md"), os.path.join("servicos", "servico.md"))
alvos = [os.path.join(ws, "CLAUDE.md")]
for base in (".claude", "doc", "tools"):
    for raiz, _, arqs in os.walk(os.path.join(ws, base)):
        alvos += [os.path.join(raiz, a) for a in arqs if a.endswith((".md", ".json", ".txt"))]
for p in alvos:
    if not os.path.exists(p) or p.endswith(modelos):
        continue
    s = open(p, encoding="utf-8").read(); o = s
    s = preencher(s)
    if s != o:
        open(p, "w", encoding="utf-8").write(s); print("preenchido", os.path.relpath(p, ws))

modelo = os.path.join(ws, ".claude", "agents", "dev.md")
if stacks and os.path.exists(modelo):
    base = open(modelo, encoding="utf-8").read()
    usados = set()
    for sid, campos in stacks.items():
        apelido = campos.get("apelido") or APELIDOS.get(sid) or next(n for n in RESERVA if n not in usados)
        usados.add(apelido)
        s = base.replace("{{STACK_ID}}", sid).replace("{{STACK_APELIDO}}", apelido)
        s = s.replace("{{STACK_NOME}}", campos.get("nome", sid))
        s = s.replace("{{CMD_TESTE_ARQUIVO}}", campos.get("teste_arquivo", "{{CMD_TESTE_ARQUIVO}}"))
        s = s.replace("{{CMD_ANTES_DE_DEVOLVER}}", campos.get("antes_de_devolver", "{{CMD_ANTES_DE_DEVOLVER}}"))
        destino = os.path.join(ws, ".claude", "agents", "%s-dev-%s.md" % (apelido, sid))
        open(destino, "w", encoding="utf-8").write(preencher(s)); print("agent", os.path.relpath(destino, ws))
    os.remove(modelo); print("removido .claude/agents/dev.md")

modelo = os.path.join(ws, ".claude", "rules", "code", "servicos", "servico.md")
if servicos and os.path.exists(modelo):
    base = open(modelo, encoding="utf-8").read()
    for nome, linhas in servicos.items():
        s = base.replace("{{SERVICO}}", nome).replace("{{SERVICO_CONTEUDO}}", "\n".join(linhas).strip())
        destino = os.path.join(os.path.dirname(modelo), "%s.md" % nome)
        open(destino, "w", encoding="utf-8").write(preencher(s)); print("rule", os.path.relpath(destino, ws))
    os.remove(modelo); print("removido .claude/rules/code/servicos/servico.md")

if mem0 in ("nao", "não", "no"):
    pasta = os.path.join(ws, ".claude", "skills", "mem0")
    if os.path.isdir(pasta):
        shutil.rmtree(pasta); print("removido .claude/skills/mem0")

if hooks:
    sp = os.path.join(ws, ".claude", "settings.json")
    cfg = json.load(open(sp, encoding="utf-8"))
    casos = " ".join('%s) %s >/dev/null 2>&1;;' % (pad.strip(), cmd.strip()) for pad, cmd in hooks)
    cmd = "f=$(jq -r '.tool_input.file_path // empty'); case \"$f\" in %s esac; exit 0" % casos
    cfg.setdefault("hooks", {})["PostToolUse"] = [{"matcher": "Write|Edit", "hooks": [{"type": "command", "timeout": 30, "command": cmd}]}]
    json.dump(cfg, open(sp, "w", encoding="utf-8"), indent=2, ensure_ascii=False); print("hook .claude/settings.json")

sobra = []
for base in ("CLAUDE.md", ".claude", "doc", "tools"):
    caminho = os.path.join(ws, base)
    arquivos = [caminho] if os.path.isfile(caminho) else [os.path.join(r, a) for r, _, aa in os.walk(caminho) for a in aa]
    for p in arquivos:
        if p.endswith((".md", ".json", ".txt", ".sh")):
            sobra += re.findall(r"\{\{[A-Z_]+\}\}", open(p, encoding="utf-8").read())
print("sobrou", " ".join(sorted(set(sobra))) or "nada")
