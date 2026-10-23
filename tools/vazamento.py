#!/usr/bin/env python3
"""Procura termos das cópias no que o /melhoria vai publicar.

Uso: python3 tools/vazamento.py [<ref base>]    (padrão: a maior tag v*)

Termos de cada cópia em .instancias/<nome>/ (lidos do git, sem checkout): o nome da cópia e
o do repositório, ## PROJETO, ## RESPONSAVEL, ## SERVICO, ## TABELA_SERVICOS e ## REPOS do devmove-valores.md,
as rules de .claude/rules/code/servicos/, os repos de tools/repos.txt e as pastas de
doc/produtos, doc/integracoes e doc/servicos. Nome com ponto entra inteiro e por parte.
Os termos ficam só na memória do script.
Cópia sem devmove-valores.md bloqueia (código 2). Serviço ou repo da cópia que falta no
arquivo de valores é relatado como desatualizado e entra nos termos mesmo assim.
Confere as linhas adicionadas em `git diff <ref base>` (rode depois de `git add -A`),
fora de tools/instancias.txt e tools/melhorias.md.
Saída: avisos por cópia, depois arquivo: termo: trecho, ou "limpo". Código 1 com achado.
"""
import os, re, subprocess, sys

raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GENERICOS = {"api", "web", "app", "docs", "core", "common", "shared", "infra", "devops", "functions",
             "service", "services", "backend", "frontend", "main", "develop", "harness", "github", "com"}


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True).stdout


termos, faltando = set(), False
for l in open(os.path.join(raiz, "tools", "instancias.txt"), encoding="utf-8"):
    p = l.split()
    if l.startswith("#") or len(p) != 4:
        continue
    nome, url, branch = p[:3]
    pasta, ref = os.path.join(raiz, ".instancias", nome), "origin/" + branch
    proprios = {nome, re.sub(r"\.git$", "", url.rstrip("/").split("/")[-1])}
    valores = git("-C", pasta, "show", "%s:devmove-valores.md" % ref)
    if not valores.strip():
        print("%s: sem devmove-valores.md na %s" % (nome, ref)); faltando = True
    secao, servicos, repos = None, set(), set()
    for v in valores.splitlines():
        m = re.match(r"^## (\S+)(?: (\S+))?", v)
        if m:
            secao = m.group(1)
            if secao == "SERVICO" and m.group(2):
                servicos.add(m.group(2))
            continue
        if secao in ("PROJETO", "RESPONSAVEL") and v.strip():
            proprios.add(v.strip())
        elif secao == "TABELA_SERVICOS" and v.startswith("| `"):
            servicos.add(v.split("`")[1])
        elif secao == "REPOS" and v.strip():
            repos.add(v.split()[0].rstrip("/").split("/")[-1])
            proprios |= set(v.split()[0].split("/"))
            proprios |= {s for s in re.split(r"[/:]", v.split()[-1]) if s and "." not in s and "@" not in s}
    # o que a cópia tem e o arquivo de valores não declara: entra nos termos e é relatado
    regras = {os.path.splitext(f)[0] for f in git("-C", pasta, "ls-tree", "--name-only", "%s:.claude/rules/code/servicos" % ref).split()}
    clonados = {r.split()[0].rstrip("/").split("/")[-1] for r in git("-C", pasta, "show", "%s:tools/repos.txt" % ref).splitlines()
                if r.strip() and not r.startswith("#")}
    sem_valor = sorted((regras - servicos - {"servico"}) | (clonados - repos)) if valores.strip() else []
    proprios |= servicos | repos | regras | clonados
    for d in ("doc/produtos", "doc/integracoes", "doc/servicos"):
        proprios |= {t.rstrip("/") for t in git("-C", pasta, "ls-tree", "--name-only", "%s:%s" % (ref, d)).split()
                     if "." not in t}
    if sem_valor:
        print("%s: devmove-valores.md desatualizado, sem: %s" % (nome, ", ".join(sem_valor)))
    termos |= proprios
for t in list(termos):
    termos |= set(t.split("."))
termos = {t for t in termos if len(t) >= 3 and t.lower() not in GENERICOS}

base = sys.argv[1] if len(sys.argv) > 1 else max(
    (t for t in git("-C", raiz, "tag", "--list", "v*").split() if re.fullmatch(r"v\d+\.\d+\.\d+", t)),
    key=lambda t: tuple(int(x) for x in t[1:].split(".")))
diff = git("-C", raiz, "diff", base, "--", ".", ":!tools/instancias.txt", ":!tools/melhorias.md")
padrao = re.compile(r"(?<![\w-])(%s)(?![\w-])" % "|".join(re.escape(t) for t in sorted(termos, key=len, reverse=True)), re.I)
achados, arquivo = [], None
for l in diff.splitlines():
    if l.startswith("+++ "):
        arquivo = l[6:]
    elif l.startswith("+") and not l.startswith("+++"):
        for m in padrao.finditer(l):
            achados.append("%s: %s: %s" % (arquivo, m.group(1), l[1:].strip()[:120]))
print("\n".join(achados) or "limpo")
sys.exit(2 if faltando else 1 if achados else 0)
