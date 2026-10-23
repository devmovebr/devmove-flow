#!/usr/bin/env python3
"""Migra dossiês de doc/demandas/<dossiê>/ (ou de outra pasta, como doc/qa/) para doc/demandas/<tipo>/<dossiê>/.

Uso: migrar_demandas.py <workspace> <mapa.txt> [--aplicar | --so-links]

mapa.txt, uma linha por dossiê: <caminho atual relativo a doc/> <tipo>
  demandas/2026-09-22-rename-x debito-tecnico
  qa/2026-10-05-relatorio-y qa
Tipos: feature, bug, debito-tecnico, qa.

Sem --aplicar só mostra o plano. --so-links refaz só a reescrita de links de uma migração já aplicada. Com --aplicar:
- move cada pasta com `git mv` (ou rename, fora de git);
- reescreve, em todo .md de doc/ e .claude/ (fora de backup/ e pastas ocultas), os links para o caminho antigo;
- cria o INDEX.md de cada tipo que não existir (cabeçalho do framework, sem linhas).
As linhas dos INDEX.md de tipo são escritas pelo assistente depois, com o Estado de cada CHANGELOG.
"""
import os, re, subprocess, sys

TIPOS = ("feature", "bug", "debito-tecnico", "qa")
ws, mapa = sys.argv[1], sys.argv[2]
aplicar = "--aplicar" in sys.argv or "--so-links" in sys.argv
so_links = "--so-links" in sys.argv
doc = os.path.join(ws, "doc")
moves = []
for linha in open(mapa, encoding="utf-8"):
    linha = linha.strip()
    if not linha or linha.startswith("#"):
        continue
    origem, tipo = linha.split()
    if tipo not in TIPOS:
        sys.exit("tipo inválido: %s" % linha)
    nome = os.path.basename(origem.rstrip("/"))
    moves.append((origem.rstrip("/"), "demandas/%s/%s" % (tipo, nome)))

for de, para in moves:
    print("%s -> %s" % (de, para))
if not aplicar:
    sys.exit(0)

em_git = subprocess.run(["git", "-C", ws, "rev-parse"], capture_output=True).returncode == 0
for de, para in ([] if so_links else moves):
    a, b = os.path.join(doc, de), os.path.join(doc, para)
    if not os.path.isdir(a):
        print("ausente", de); continue
    os.makedirs(os.path.dirname(b), exist_ok=True)
    rastreado = em_git and subprocess.run(["git", "-C", ws, "ls-files", "--error-unmatch", a], capture_output=True).returncode == 0
    if rastreado:
        subprocess.run(["git", "-C", ws, "mv", a, b], check=True)
        if os.path.isdir(a):  # sobra não versionada (ex.: tmp/)
            for raiz, _, arqs in os.walk(a):
                for f in arqs:
                    src = os.path.join(raiz, f); dst = os.path.join(b, os.path.relpath(src, a))
                    os.makedirs(os.path.dirname(dst), exist_ok=True); os.rename(src, dst)
            subprocess.run(["find", a, "-depth", "-type", "d", "-empty", "-delete"])
    else:
        os.rename(a, b)
    print("movido", de)

# links de saída dos arquivos movidos: o dossiê desceu de nível, então link relativo que
# apontava para fora dele (produtos/, servicos/, outro dossiê) é recalculado a partir do local antigo.
# Só troca link que existia no local antigo e quebrou no novo.
link_md = re.compile(r"\]\((?!https?:|#|/)([^)\s#]+)(#[^)]*)?\)")
mapa_abs = [(os.path.normpath(os.path.join(doc, de)), os.path.normpath(os.path.join(doc, para))) for de, para in moves]


def para_novo(caminho):
    for a, b in mapa_abs:
        if caminho == a or caminho.startswith(a + os.sep):
            return b + caminho[len(a):]
    return caminho


for de, para in moves:
    novo_dir = os.path.join(doc, para)
    for raiz, _, arqs in os.walk(novo_dir):
        for f in arqs:
            if not f.endswith(".md"):
                continue
            arq = os.path.join(raiz, f)
            antigo_arq = os.path.join(doc, de, os.path.relpath(arq, novo_dir))
            s = open(arq, encoding="utf-8").read()

            def conserta(m):
                alvo, ancora = m.group(1), m.group(2) or ""
                if os.path.exists(os.path.normpath(os.path.join(raiz, alvo))):
                    return m.group(0)
                antes = os.path.normpath(os.path.join(os.path.dirname(antigo_arq), alvo))
                depois = para_novo(antes)
                if not os.path.exists(depois):
                    return m.group(0)
                return "](%s%s)" % (os.path.relpath(depois, raiz), ancora)

            n = link_md.sub(conserta, s)
            if n != s:
                open(arq, "w", encoding="utf-8").write(n); print("saida", os.path.relpath(arq, ws))

# reescrita de links: nome do dossiê é único (data + slug), então troca o trecho de caminho
nomes = {os.path.basename(de): (de, para) for de, para in moves}
padrao = re.compile(r"(?P<pre>[\(\s`'\"/]|^)(?P<cam>(?:\.\./|\./|doc/)*(?:demandas/|qa/)?(?:[a-z-]+/)?)(?P<nome>%s)(?=[/\)\s`'\"#]|$)"
                    % "|".join(re.escape(n) for n in sorted(nomes, key=len, reverse=True)))
alvos = []
for base in ("doc", ".claude"):
    for raiz, dirs, arqs in os.walk(os.path.join(ws, base)):
        dirs[:] = [d for d in dirs if d not in ("backup", "worktrees") and not d.startswith(".")]  # cópia histórica fica intacta
        alvos += [os.path.join(raiz, f) for f in arqs if f.endswith(".md")]
alvos.append(os.path.join(ws, "CLAUDE.md"))


def novo_link(arquivo, nome):
    _, para = nomes[nome]
    destino = os.path.join(doc, para)
    return os.path.relpath(destino, os.path.dirname(arquivo))


for arq in alvos:
    if not os.path.isfile(arq):
        continue
    s = open(arq, encoding="utf-8").read()

    def troca(m):
        cam, nome = m.group("cam"), m.group("nome")
        if not cam:  # nome solto em texto (ex.: tabela, CHANGELOG): mantém
            return m.group(0)
        if "doc/" in cam:  # caminho a partir de doc/, com ou sem prefixo de outra pasta
            return m.group("pre") + cam[:cam.index("doc/")] + "doc/" + nomes[nome][1]
        if cam.startswith(("demandas/", "qa/")):  # caminho a partir de doc/, comum em prosa
            return m.group("pre") + nomes[nome][1]
        return m.group("pre") + novo_link(arq, nome)

    n = padrao.sub(troca, s)
    if n != s:
        open(arq, "w", encoding="utf-8").write(n); print("links", os.path.relpath(arq, ws))

cab = {
    "feature": "# Feature: INDEX\n\nFuncionalidade nova ou melhoria, mesmo pequena. Épico mora aqui e aponta as fases. Estado de cada uma no `CHANGELOG.md` dela.\n\n| Dossiê | Porte | Serviços | Estado | Depende de |\n|---|---|---|---|---|\n",
    "bug": "# Bug: INDEX\n\nComportamento errado em algo que já existe. Plano com reprodução e aceite de regressão. Estado no `CHANGELOG.md` de cada um.\n\n| Dossiê | Porte | Serviços | Estado | Origem |\n|---|---|---|---|---|\n",
    "debito-tecnico": "# Débito técnico: INDEX\n\nMudança sem efeito de comportamento: refatoração, rename, limpeza, dependência. Nasce em `backlog`; `/retomar <dossiê>` prioriza.\n\n| Dossiê | Porte | Serviços | Estado | Origem |\n|---|---|---|---|---|\n",
    "qa": "# QA: INDEX\n\nTeste de entrega já integrada, aberto pelo `/qa`. Por pasta: `bruto/`, `plano-teste.md`, `massa/`, `evidencias/<ambiente>.md`, `parecer-<ambiente>.md`. Sem CHANGELOG: o estado é a coluna Status.\n\n| Data | Pasta | Serviço | Origem | Status |\n|---|---|---|---|---|\n",
}
for t in TIPOS:
    p = os.path.join(doc, "demandas", t, "INDEX.md")
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "w", encoding="utf-8").write(cab[t]); print("criado", os.path.relpath(p, ws))
