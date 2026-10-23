#!/usr/bin/env python3
"""Atualiza o harness deste workspace para a última versão publicada do DevMove Flow.

Uso: python3 <workspace>/tools/atualizar_framework.py [--checar] [--fonte <clone do devmove-flow>] [--workspace <dir>]

Versão instalada: marca de .claude/fluxo.md. Versão nova: maior tag v<x.y.z> do framework
(com --fonte, o VERSION da árvore de trabalho do clone, usado pelo /melhoria antes da tag).
Sem --fonte, o framework é clonado ou atualizado em tools/.local/devmove-flow.
--workspace atualiza outro workspace (padrão: o que contém este script).

Renderiza as duas versões com devmove-valores.md e faz merge de 3 vias em cada arquivo:
o que só o workspace mudou fica, o que só o framework mudou entra, mudança dos dois lados
no mesmo trecho vira conflito marcado no arquivo.
--checar só compara as versões.

Saída, primeira linha: "em dia X", "sem acesso ao framework", "nova X -> Y" (--checar),
"major X -> Y" (migração assistida, nada aplicado) ou "atualizado X -> Y", seguida de uma
linha por arquivo: novo, alterado, removido, conflito ou mantido. Por último, "aviso" quando
devmove-valores.md não declara um serviço com rule ou um repositório de tools/repos.txt.
Código: 0 sem conflito, 1 com conflito, 2 bloqueado.
"""
import io, os, re, shutil, subprocess, sys, tarfile, tempfile, datetime

URL = os.environ.get("DEVMOVE_FLOW_URL", "https://github.com/devmovebr/devmove-flow.git")
MARCA = re.compile(r"Versão do DevMove Flow: (\d+\.\d+\.\d+)[^\n]*")
args = sys.argv[1:]
ws = os.path.abspath(args[args.index("--workspace") + 1]) if "--workspace" in args \
    else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
checar = "--checar" in args
fonte = os.path.abspath(args[args.index("--fonte") + 1]) if "--fonte" in args else None


def run(*cmd, **kw):
    return subprocess.run(cmd, capture_output=True, **kw)


def num(v):
    return tuple(int(x) for x in v.split("."))


def sair(msg, codigo):
    print(msg); sys.exit(codigo)


def avisos_valores():
    """Serviço com rule ou repositório (pelo nome da pasta) em tools/repos.txt que o arquivo de valores não declara."""
    texto = open(valores, encoding="utf-8").read()
    declarados = set(re.findall(r"^## SERVICO (\S+)", texto, re.M)) | set(re.findall(r"^\| `([^`]+)` \|", texto, re.M))
    secao = re.search(r"^## REPOS\n(.*?)(?=^## |\Z)", texto, re.M | re.S)
    declarados |= {l.split()[0].rstrip("/").split("/")[-1] for l in (secao.group(1) if secao else "").splitlines() if l.strip()}
    pasta = os.path.join(ws, ".claude", "rules", "code", "servicos")
    achados = {os.path.splitext(f)[0] for f in os.listdir(pasta) if f.endswith(".md")} if os.path.isdir(pasta) else set()
    repos = os.path.join(ws, "tools", "repos.txt")
    if os.path.isfile(repos):
        achados |= {l.split()[0].rstrip("/").split("/")[-1] for l in open(repos, encoding="utf-8") if l.strip() and not l.startswith("#")}
    falta = sorted(achados - declarados - {"servico"})
    return ["aviso devmove-valores.md desatualizado, sem: " + ", ".join(falta)] if falta else []


fluxo = os.path.join(ws, ".claude", "fluxo.md")
m = MARCA.search(open(fluxo, encoding="utf-8").read())
if not m:
    sair("sem marca de versão em .claude/fluxo.md", 2)
instalada = m.group(1)

if fonte is None:
    fonte = os.path.join(ws, "tools", ".local", "devmove-flow")
    if os.path.isdir(os.path.join(fonte, ".git")):
        r = run("git", "-C", fonte, "fetch", "-q", "--tags", "--force", "origin")
    else:
        r = run("git", "clone", "-q", "--filter=blob:none", "--no-checkout", URL, fonte)
    if r.returncode:
        sair("sem acesso ao framework", 0)
    tags = [t[1:] for t in run("git", "-C", fonte, "tag", "--list", "v*", text=True).stdout.split()
            if re.fullmatch(r"v\d+\.\d+\.\d+", t)]
    nova = max(tags, key=num) if tags else instalada
    ref_nova = "v" + nova
else:
    nova = open(os.path.join(fonte, "VERSION"), encoding="utf-8").read().strip()
    ref_nova = None  # árvore de trabalho

valores = os.path.join(ws, "devmove-valores.md")
if not os.path.isfile(valores):
    sair("sem devmove-valores.md na raiz do workspace", 2)
if num(nova) <= num(instalada):
    sair("\n".join(["em dia " + instalada] + avisos_valores()), 0)
if checar:
    sair("nova %s -> %s" % (instalada, nova), 0)
if num(nova)[0] > num(instalada)[0]:
    sair("major %s -> %s: siga a Migração da versão no CHANGELOG do framework" % (instalada, nova), 2)
if run("git", "-C", fonte, "rev-parse", "-q", "--verify", "v%s^{commit}" % instalada).returncode:
    sair("tag v%s não existe no framework" % instalada, 2)
sujo = run("git", "-C", ws, "status", "--porcelain", "--", "CLAUDE.md", ".claude", "tools", text=True).stdout
if sujo.strip():
    sair("harness com mudança não commitada: commite antes de atualizar\n" + sujo.rstrip(), 2)

tmp = tempfile.mkdtemp(prefix="devmove-")


def renderizar(ref, nome):
    raiz = os.path.join(tmp, nome)
    if ref is None:
        for p in ("framework", "setup"):
            shutil.copytree(os.path.join(fonte, p), os.path.join(raiz, p), ignore=shutil.ignore_patterns(".DS_Store"))
        shutil.copy(os.path.join(fonte, "VERSION"), raiz)
    else:
        tar = run("git", "-C", fonte, "archive", ref, "framework", "setup", "VERSION")
        if tar.returncode:
            sair("falha ao ler %s do framework" % ref, 2)
        with tarfile.open(fileobj=io.BytesIO(tar.stdout)) as t:
            t.extractall(raiz, filter="data") if hasattr(tarfile, "data_filter") else t.extractall(raiz)
    destino = os.path.join(tmp, nome + "-ws")
    r = run("bash", os.path.join(raiz, "setup", "lib", "instalar.sh"), destino, "--valores", valores, text=True)
    if r.returncode:
        sair("falha ao renderizar %s\n%s" % (nome, r.stderr), 2)
    return destino


base = renderizar("v" + instalada, "base")
novo = renderizar(ref_nova, "nova")


def listar(raiz):
    return {os.path.relpath(os.path.join(r, a), raiz) for r, _, aa in os.walk(raiz) for a in aa if a != ".DS_Store"}


def ler(p):
    return open(p, "rb").read() if os.path.isfile(p) else None


def gravar(p, dados, modo_de=None):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "wb").write(dados)
    if modo_de and os.access(modo_de, os.X_OK):
        os.chmod(p, 0o755)


rel_fluxo = os.path.join(".claude", "fluxo.md")
conflitos, linhas = 0, []
for rel in sorted(listar(base) | listar(novo)):
    b, n, aqui = ler(os.path.join(base, rel)), ler(os.path.join(novo, rel)), os.path.join(ws, rel)
    l = ler(aqui)
    if rel == rel_fluxo and l is not None and b is not None:  # a marca é reescrita no fim
        l = MARCA.sub(MARCA.search(b.decode("utf-8")).group(0), l.decode("utf-8"), count=1).encode("utf-8")
    if b == n or l == n:
        continue
    if n is None:
        if l is None:
            continue
        if l == b:
            os.remove(aqui); linhas.append("removido " + rel)
        else:
            conflitos += 1; linhas.append("conflito %s: removido no framework, alterado aqui" % rel)
        continue
    if l is None:
        if b is None:
            gravar(aqui, n, os.path.join(novo, rel)); linhas.append("novo " + rel)
        else:
            linhas.append("mantido %s: apagado aqui" % rel)
        continue
    with tempfile.TemporaryDirectory(dir=tmp) as d:
        caminhos = []
        for nome, dados in (("aqui", l), ("base", b or b""), ("framework", n)):
            caminhos.append(os.path.join(d, nome)); open(caminhos[-1], "wb").write(dados)
        r = run("git", "merge-file", "-p", "-L", "aqui", "-L", "base", "-L", "framework", *caminhos)
    if r.returncode < 0:
        sair("falha no merge de " + rel, 2)
    gravar(aqui, r.stdout)
    if r.returncode:
        conflitos += 1; linhas.append("conflito " + rel)
    else:
        linhas.append("alterado " + rel)

hoje = datetime.date.today().isoformat()
s = open(fluxo, encoding="utf-8").read()
open(fluxo, "w", encoding="utf-8").write(MARCA.sub("Versão do DevMove Flow: %s (atualizado em %s)." % (nova, hoje), s, count=1))
shutil.rmtree(tmp, ignore_errors=True)
print("atualizado %s -> %s" % (instalada, nova))
print("\n".join(linhas + avisos_valores()))
sys.exit(1 if conflitos else 0)
