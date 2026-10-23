import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Rodada } from '../shared/tipos.ts'
import { type ExecucaoCompleta, repositorio } from './banco.ts'
import { parsearCenario } from './parser.ts'
import { arquivoLocal, lerEnv, nomesUsados } from './variaveis.ts'
import { lerSuite, pastaDossie } from './workspaces.ts'

type Origem = { tipo: 'literal'; valor: string } | { tipo: 'cmd'; cmd: string } | { tipo: 'local' }

const MAX_LINHAS_CORPO = 60

export function dataCurta(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function segundos(ms: number): string {
  return `${(ms / 1000).toFixed(2).replace('.', ',')}s`
}

function aspasSimples(s: string): string {
  return /^[A-Za-z0-9_.:/@%+=,-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`
}

// Palavra de shell com {{X}} virando $X, salvo as variáveis fixadas pelo cenário.
function palavra(t: string, fixas: Record<string, string>): string {
  if (!/\{\{/.test(t)) return aspasSimples(t)
  const esc = (s: string) => s.replace(/[\\"$`]/g, (c) => `\\${c}`)
  let r = ''
  let ultimo = 0
  for (const m of t.matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g)) {
    r += esc(t.slice(ultimo, m.index))
    r += m[1] in fixas ? esc(fixas[m[1]]) : `\${${m[1]}}`
    ultimo = m.index + m[0].length
  }
  r += esc(t.slice(ultimo))
  return `"${r.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}(?![A-Za-z0-9_])/g, '$$$1')}"`
}

function comandoAbsoluto(ws: string, cmd: string): string {
  const [primeiro] = cmd.split(/\s+/)
  if (primeiro.includes('/') && !primeiro.startsWith('/')) return `${join(ws, primeiro.replace(/^\.\//, ''))}${cmd.slice(primeiro.length)}`
  return `cd ${aspasSimples(ws)} && ${cmd}`
}

function origens(ws: string, amb: string, suite: Record<string, string>): Record<string, Origem> {
  const r: Record<string, Origem> = {}
  const arqAmb = join(ws, 'tools', 'ambientes', `${amb}.env`)
  const camadas: [Record<string, string>, boolean][] = [
    [existsSync(arqAmb) ? lerEnv(readFileSync(arqAmb, 'utf8')) : {}, false],
    [existsSync(arquivoLocal(ws, amb)) ? lerEnv(readFileSync(arquivoLocal(ws, amb), 'utf8')) : {}, true],
    [suite, false],
  ]
  for (const [valores, local] of camadas) {
    for (const [k, v] of Object.entries(valores)) {
      if (k.endsWith('_CMD')) r[k.slice(0, -4)] = { tipo: 'cmd', cmd: v }
      else r[k] = local ? { tipo: 'local' } : { tipo: 'literal', valor: v }
    }
  }
  return r
}

function corpoFormatado(body: string): string {
  let texto = body
  try {
    texto = JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    // corpo não é JSON
  }
  const linhas = texto.split('\n')
  if (linhas.length <= MAX_LINHAS_CORPO) return texto
  return [...linhas.slice(0, MAX_LINHAS_CORPO), `... (${linhas.length - MAX_LINHAS_CORPO} linhas cortadas)`].join('\n')
}

function curl(e: ExecucaoCompleta): string {
  const c = parsearCenario(e.cenario_md)
  const req = c.request.method ? c.request : { ...e.request }
  let body = req.body
  try {
    body = JSON.stringify(JSON.parse(body))
  } catch {
    // mantém como está
  }
  const partes = ['curl -sS', `-X ${req.method}`]
  for (const [k, v] of req.headers) partes.push(`-H ${palavra(`${k}: ${v}`, c.env)}`)
  if (body) partes.push(`-d ${palavra(body, c.env)}`)
  partes.push(palavra(req.url, c.env))
  return partes.join(' ')
}

function obtidoTexto(v: unknown): string {
  return v === undefined ? 'nada' : JSON.stringify(v)
}

export function gerarEvidencia(ws: string, dossie: string, amb: string): string | null {
  const repo = repositorio(ws)
  const suite = lerSuite(ws, dossie)
  const ultimas = new Map<string, ExecucaoCompleta>()
  for (const e of repo.execucoesDoDossie(dossie, amb)) if (!ultimas.has(e.cenario)) ultimas.set(e.cenario, e)
  if (!ultimas.size) return null

  const rodadas = new Map<number, Rodada>()
  for (const e of ultimas.values()) if (!rodadas.has(e.rodada_id)) rodadas.set(e.rodada_id, repo.rodada(e.rodada_id, suite.cenarios.length)!)
  const listaRodadas = [...rodadas.values()]
    .sort((a, b) => a.id - b.id)
    .map((r) => `#${r.id} (${r.origem}, ${dataCurta(r.iniciada_em)})`)

  const execs = suite.cenarios.map((c) => ultimas.get(c.id)).filter((e): e is ExecucaoCompleta => !!e)
  for (const e of ultimas.values()) if (!execs.includes(e)) execs.push(e)

  const usados: string[] = []
  for (const e of execs) {
    const c = parsearCenario(e.cenario_md)
    const t = [c.request.url, ...c.request.headers.map(([k, v]) => `${k}: ${v}`), c.request.body].join('\n')
    for (const n of nomesUsados(t)) if (!usados.includes(n)) usados.push(n)
  }
  const orig = origens(ws, amb, suite.variaveis)
  const exports: string[] = []
  if (usados.some((n) => orig[n]?.tipo === 'local')) exports.push(`set -a; . ${aspasSimples(arquivoLocal(ws, amb))}; set +a`)
  for (const n of usados) {
    const o = orig[n]
    if (!o) exports.push(`export ${n}=  # sem valor no ambiente`)
    else if (o.tipo === 'literal') exports.push(`export ${n}=${aspasSimples(o.valor)}`)
    else if (o.tipo === 'cmd') exports.push(`export ${n}=$(${comandoAbsoluto(ws, o.cmd)})`)
  }

  const md: string[] = [
    `# Evidências: ${amb}`,
    '',
    `Gerado pelo painel. Rodadas: ${listaRodadas.join(', ')}`,
    '',
    '```bash',
    ...exports,
    '```',
  ]
  for (const e of execs) {
    md.push('', `## ${e.cenario} ${e.titulo}`)
    const cmd = curl(e)
    md.push(cmd.includes('\n') ? ['```bash', cmd, '```'].join('\n') : `\`${cmd}\``)
    if (e.resposta) {
      md.push(`HTTP ${e.resposta.status} · ${segundos(e.resposta.tempo_ms)} · rodada #${e.rodada_id}`)
      md.push('```json', corpoFormatado(e.resposta.body), '```')
    } else {
      md.push(`Erro: ${e.erro ?? 'sem resposta'} · rodada #${e.rodada_id}`)
    }
    for (const a of e.assercoes) {
      if (a.tipo === 'manual') md.push(`- [ ] ${a.texto} (manual)`)
      else if (a.ok) md.push(`- [x] ${a.texto}`)
      else if (a.ok === null) md.push(`- [ ] ${a.texto} (não avaliada)`)
      else md.push(`- [ ] ${a.texto} (obtido: ${obtidoTexto(a.obtido)})`)
    }
    let linha = e.veredito
    if (e.veredito !== e.veredito_auto) linha += ` (automático: ${e.veredito_auto})`
    if (e.nota) linha += ` · nota: ${e.nota}`
    md.push(linha)
  }

  const dir = join(pastaDossie(ws, dossie), 'evidencias')
  mkdirSync(dir, { recursive: true })
  const arq = join(dir, `${amb}.md`)
  writeFileSync(arq, `${md.join('\n')}\n`)
  return arq
}
