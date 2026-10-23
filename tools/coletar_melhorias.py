#!/usr/bin/env python3
"""Coleta os commits de melhoria de harness das cópias desde o último /melhoria.

Uso: python3 tools/coletar_melhorias.py [--marcar]

Lê tools/instancias.txt, clona ou atualiza cada cópia em .instancias/<nome> (fora do git)
e lista os commits da branch depois do último commit lido.
Commit com [framework] no assunto tem o diff gravado em .instancias/coleta/<nome>-<hash>.diff.
Saída: uma linha por commit novo (cópia, hash, classe, assunto) e o topo de cada branch.
--marcar grava em instancias.txt o topo lido na última coleta (rodar depois da publicação).
"""
import os, re, subprocess, sys

raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lista = os.path.join(raiz, "tools", "instancias.txt")
cache = os.path.join(raiz, ".instancias")
topos_arq = os.path.join(cache, "topos.txt")


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True)


linhas = open(lista, encoding="utf-8").read().splitlines()

if "--marcar" in sys.argv:
    topos = dict(l.split() for l in open(topos_arq, encoding="utf-8").read().splitlines() if l.strip())
    saida = []
    for l in linhas:
        p = l.split()
        if l.startswith("#") or len(p) != 4 or p[0] not in topos:
            saida.append(l); continue
        saida.append(" ".join(p[:3] + [topos[p[0]]])); print("marcado", p[0], topos[p[0]])
    open(lista, "w", encoding="utf-8").write("\n".join(saida) + "\n")
    sys.exit(0)

os.makedirs(os.path.join(cache, "coleta"), exist_ok=True)
for f in os.listdir(os.path.join(cache, "coleta")):
    os.remove(os.path.join(cache, "coleta", f))
topos, erro = [], False
for l in linhas:
    p = l.split()
    if l.startswith("#") or len(p) != 4:
        continue
    nome, url, branch, ultimo = p
    pasta = os.path.join(cache, nome)
    r = git("-C", pasta, "fetch", "-q", "origin", branch) if os.path.isdir(os.path.join(pasta, ".git")) \
        else git("clone", "-q", "--no-checkout", "--branch", branch, url, pasta)
    if r.returncode:
        print("%s: sem acesso (%s)" % (nome, r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "erro")); erro = True
        continue
    topo = git("-C", pasta, "rev-parse", "--short", "origin/" + branch).stdout.strip()
    topos.append("%s %s" % (nome, topo))
    if git("-C", pasta, "cat-file", "-e", ultimo + "^{commit}").returncode:
        print("%s: último commit lido %s não está na branch (push pendente?)" % (nome, ultimo)); erro = True
        continue
    commits = git("-C", pasta, "log", "--reverse", "--format=%h\t%s", "%s..origin/%s" % (ultimo, branch)).stdout.splitlines()
    for c in commits:
        h, assunto = c.split("\t", 1)
        classe = re.search(r"\[(framework|local)\]", assunto)
        classe = classe.group(1) if classe else "-"
        print("%s %s %s %s" % (nome, h, classe, assunto))
        if classe == "framework":
            diff = git("-C", pasta, "show", "--format=%B", h).stdout
            open(os.path.join(cache, "coleta", "%s-%s.diff" % (nome, h)), "w", encoding="utf-8").write(diff)
    print("%s: topo %s, %d commits novos" % (nome, topo, len(commits)))
open(topos_arq, "w", encoding="utf-8").write("\n".join(topos) + "\n")
sys.exit(1 if erro else 0)
