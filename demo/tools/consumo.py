#!/usr/bin/env python3
"""Consumo de tokens e chamadas de um dossie, lido dos transcripts do Claude Code.

Uso: python3 tools/consumo.py <dossie> [--saida <arquivo>]

<dossie>   pasta do dossie (ex.: doc/demandas/feature/2026-10-21-slug).
--saida    grava em outro arquivo; padrao <dossie>/consumo.json.

Le ~/.claude/projects/<workspace>/<sessao>.jsonl e <sessao>/subagents/agent-*.jsonl.
Agent entra no dossie quando e o primeiro citado no prompt de spawn; as passadas por
SendMessage vem pelo agentId. Turno do orquestrador entra quando cita o slug ou
fala com um agent do dossie. Sessoes de outras maquinas ja gravadas no
consumo.json sao mantidas (chave por sessionId). Formato desconhecido: n/d,
aviso e saida 0. Sem estado, sem lock: rodar de novo sobrescreve.
"""
import datetime, glob, json, os, re, socket, sys

CAMPOS = {'entrada': 'input_tokens', 'saida': 'output_tokens',
          'cache_escrita': 'cache_creation_input_tokens', 'cache_leitura': 'cache_read_input_tokens'}


def aviso(msg):
    print('consumo: aviso: ' + msg, file=sys.stderr)


def linhas(path):
    with open(path, encoding='utf-8') as f:
        for linha in f:
            try:
                yield json.loads(linha)
            except ValueError:
                continue


def texto(row):
    c = (row.get('message') or {}).get('content')
    if isinstance(c, str):
        return c
    return ' '.join(b.get('text', '') for b in c or [] if isinstance(b, dict) and b.get('type') == 'text')


def eh_tool_result(row):
    c = (row.get('message') or {}).get('content')
    return isinstance(c, list) and any(isinstance(b, dict) and b.get('type') == 'tool_result' for b in c)


def segundos(a, b):
    try:
        f = lambda t: datetime.datetime.fromisoformat(t.replace('Z', '+00:00'))
        return round((f(b) - f(a)).total_seconds())
    except (TypeError, ValueError, AttributeError):
        return None


def novo():
    return {**{k: 0 for k in CAMPOS}, 'chamadas': 0, 'msgs': {}, 'tools': set(), 'ini': None, 'fim': None}


def soma(acc, row):
    """Deduplica por message.id (ou requestId) e fica com o maior contador de cada mensagem."""
    m = row.get('message') or {}
    ident = m.get('id') or row.get('requestId') or row.get('uuid')
    uso = m.get('usage') or {}
    atual = acc['msgs'].setdefault(ident, {k: 0 for k in CAMPOS})
    for k, campo in CAMPOS.items():
        atual[k] = max(atual[k], uso.get(campo) or 0)
    atual['contexto'] = sum(atual[k] for k in CAMPOS)
    for b in m.get('content') or []:
        if isinstance(b, dict) and b.get('type') == 'tool_use':
            acc['tools'].add(b.get('id'))
    ts = row.get('timestamp')
    acc['ini'] = acc['ini'] or ts
    acc['fim'] = ts or acc['fim']


def fecha(acc):
    out = {k: sum(m[k] for m in acc['msgs'].values()) for k in CAMPOS}
    ultimo = list(acc['msgs'].values())[-1] if acc['msgs'] else {}
    out.update(chamadas=len(acc['tools']), duracao_s=segundos(acc['ini'], acc['fim']),
               contexto_final=ultimo.get('contexto', 0), inicio=acc['ini'])
    return out


def agent(path, slug):
    rows = list(linhas(path))
    primeiro = next((r for r in rows if r.get('type') == 'user' and not eh_tool_result(r)), None)
    citados = re.findall(r'\d{4}-\d{2}-\d{2}-[a-z0-9-]*[a-z0-9]', texto(primeiro) if primeiro else '')
    if not citados or not citados[0].startswith(slug):  # o dossie do agent e o primeiro citado no briefing
        return None
    passadas, pid, acc = [], None, None
    for r in rows:
        if r.get('type') == 'user' and not eh_tool_result(r) and r.get('promptId') != pid:
            pid = r.get('promptId')
            if acc and acc['msgs']:
                passadas.append(fecha(acc))
            acc = novo()
        elif r.get('type') == 'assistant' and acc is not None:
            soma(acc, r)
    if acc and acc['msgs']:
        passadas.append(fecha(acc))
    anterior = 0
    for p in passadas:
        p['delta_contexto'] = p['contexto_final'] - anterior
        anterior = p['contexto_final']
    meta = {}
    try:
        meta = json.load(open(path[:-len('.jsonl')] + '.meta.json'))
    except (OSError, ValueError):
        pass
    return {'id': os.path.basename(path)[6:-6], 'tipo': meta.get('agentType'), 'descricao': meta.get('description'),
            'chamadas': sum(p['chamadas'] for p in passadas), 'contexto_final': anterior, 'passadas': passadas}


def sessao(path, slug):
    sid = os.path.basename(path)[:-6]
    agents = [a for a in (agent(p, slug) for p in sorted(glob.glob(os.path.join(path[:-6], 'subagents', 'agent-*.jsonl')))) if a]
    ids = {a['id'] for a in agents}
    acc, turno, usd, cita = novo(), None, None, False
    def fecha_turno():
        if turno and cita:
            for r in turno:
                soma(acc, r)
    for r in linhas(path):
        if r.get('type') == 'cost-state':
            usd = r.get('totalCostUSD')
        marca = r.get('type') == 'user' and not eh_tool_result(r)
        if marca or (r.get('attachment') or {}).get('type') == 'queued_command':
            fecha_turno()
            turno, cita = [], slug in texto(r) or any(i in texto(r) for i in ids)
        elif r.get('type') == 'assistant':
            turno = [] if turno is None else turno
            turno.append(r)
            bruto = json.dumps((r.get('message') or {}).get('content'), ensure_ascii=False)
            cita = cita or slug in bruto or any(i in bruto for i in ids)
    fecha_turno()
    if not agents and not acc['msgs']:
        return sid, None
    orq = fecha(acc)
    orq.pop('contexto_final')
    return sid, {'maquina': socket.gethostname(), 'coletado_em': agora(), 'usd_sessao': usd,
                 'orquestrador': orq, 'agents': agents}


def agora():
    return datetime.datetime.now().astimezone().isoformat(timespec='seconds')


def total(sessoes):
    agents = [a for s in sessoes.values() for a in s.get('agents', [])]
    t = {k: sum(p[k] for a in agents for p in a['passadas']) + sum(s['orquestrador'][k] for s in sessoes.values())
         for k in CAMPOS}
    maior = max(agents, key=lambda a: a['contexto_final'], default=None)
    usds = [s.get('usd_sessao') for s in sessoes.values()]
    t.update(agents=len(agents), passadas=sum(len(a['passadas']) for a in agents),
             contexto_agents=sum(a['contexto_final'] for a in agents), chamadas_agents=sum(a['chamadas'] for a in agents),
             chamadas_orquestrador=sum(s['orquestrador']['chamadas'] for s in sessoes.values()),
             maior=maior and {'tipo': maior['tipo'], 'contexto_final': maior['contexto_final'], 'chamadas': maior['chamadas']},
             usd_sessoes=round(sum(usds), 2) if usds and None not in usds else None)
    return t


def k(n):
    return 'n/d' if n is None else ('%.1fM' % (n / 1e6) if n >= 1e6 else '%dk' % round(n / 1e3))


def main(argv):
    if not argv or argv[0].startswith('-'):
        print(__doc__.strip().splitlines()[2])
        return 0
    dossie = os.path.abspath(argv[0].rstrip('/'))
    saida = argv[argv.index('--saida') + 1] if '--saida' in argv else os.path.join(dossie, 'consumo.json')
    slug = os.path.basename(dossie)
    if not os.path.isdir(dossie):
        aviso('dossie nao encontrado: ' + dossie)
        print('consumo: n/d')
        return 0
    ws = dossie
    while ws != '/' and not os.path.isdir(os.path.join(ws, '.claude')):
        ws = os.path.dirname(ws)
    pasta = os.path.expanduser('~/.claude/projects/' + re.sub(r'[^A-Za-z0-9]', '-', ws))
    anterior = {}
    try:
        anterior = json.load(open(saida)).get('sessoes', {})
    except (OSError, ValueError):
        pass
    sessoes = {}
    try:
        locais = sorted(glob.glob(os.path.join(pasta, '*.jsonl')))
        if not locais:
            aviso('sem transcripts em ' + pasta)
        for p in locais:
            sid, dado = sessao(p, slug)
            anterior.pop(sid, None)
            if dado:
                sessoes[sid] = dado
    except Exception as e:  # formato desconhecido nunca trava o fluxo
        aviso('formato desconhecido (%s: %s); consumo n/d' % (type(e).__name__, e))
        print('consumo: n/d')
        return 0
    sessoes.update(anterior)
    t = total(sessoes)
    dado = {'dossie': slug, 'coletado_em': agora(), 'maquina': socket.gethostname(), 'sessoes': sessoes, 'total': t}
    with open(saida, 'w', encoding='utf-8') as f:
        json.dump(dado, f, ensure_ascii=False, indent=1)
    if not sessoes:
        print('consumo: n/d (nenhuma sessao cita o dossie nesta maquina)')
        return 0
    m = t['maior']
    print('consumo medido (tools/consumo.py): %d sessoes, %d agents, %d passadas · maior %s %s/%d · total %s/%d'
          ' · orquestrador %d chamadas · cache leitura %s · USD %s' % (
              len(sessoes), t['agents'], t['passadas'], m['tipo'] if m else 'n/d', k(m and m['contexto_final']),
              m['chamadas'] if m else 0, k(t['contexto_agents']), t['chamadas_agents'], t['chamadas_orquestrador'],
              k(t['cache_leitura']), 'n/d' if t['usd_sessoes'] is None else '%.2f' % t['usd_sessoes']))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
