import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import type { Demanda, Projeto } from '../shared/tipos.ts'
import { repositorio } from './banco.ts'
import { ErroRunner } from './erros.ts'
import { parsearPlano, type SuiteLida } from './parser.ts'

export function ehWorkspace(dir: string): boolean {
  return ['CLAUDE.md', 'devmove-valores.md', 'doc/demandas'].every((p) => existsSync(join(dir, p)))
}

export function listarProjetos(raiz: string): Projeto[] {
  if (!existsSync(raiz)) return []
  return readdirSync(raiz)
    .filter((n) => !n.startsWith('.'))
    .map((nome) => ({ nome, caminho: join(raiz, nome) }))
    .filter((p) => statSync(p.caminho).isDirectory() && ehWorkspace(p.caminho))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

// Registro da UI instalada: um caminho absoluto de projeto por linha, # comenta.
export function lerProjetosRegistrados(arquivo: string): Projeto[] {
  if (!existsSync(arquivo)) return []
  return readFileSync(arquivo, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && ehWorkspace(l))
    .map((caminho) => ({ nome: basename(caminho), caminho }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

export function acharWorkspace(de: string): string | null {
  let dir = resolve(de)
  for (;;) {
    if (ehWorkspace(dir)) return dir
    const pai = dirname(dir)
    if (pai === dir) return null
    dir = pai
  }
}

export function normalizarDossie(arg: string): string {
  return arg
    .replace(/^\.\//, '')
    .replace(/^doc\/demandas\//, '')
    .replace(/\/+$/, '')
}

export function pastaDossie(ws: string, dossie: string): string {
  return join(ws, 'doc', 'demandas', dossie)
}

export function lerSuite(ws: string, dossie: string): SuiteLida {
  if (!/^[^/.][^/]*\/[^/.][^/]*$/.test(dossie)) throw new ErroRunner(`dossiê inválido: ${dossie}`)
  const arq = join(pastaDossie(ws, dossie), 'plano-teste.md')
  if (!existsSync(arq)) throw new ErroRunner(`plano-teste.md não encontrado em doc/demandas/${dossie}`, 404)
  return parsearPlano(readFileSync(arq, 'utf8'))
}

type LinhaIndex = { data?: string; servicos?: string; status?: string; origem?: string }

function celulas(linha: string): string[] {
  return linha.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
}

export function lerIndexTipo(ws: string, tipo: string): Map<string, LinhaIndex> {
  const r = new Map<string, LinhaIndex>()
  const arq = join(ws, 'doc', 'demandas', tipo, 'INDEX.md')
  if (!existsSync(arq)) return r
  const linhas = readFileSync(arq, 'utf8').split('\n')
  for (let i = 0; i < linhas.length - 1; i++) {
    if (!linhas[i].trim().startsWith('|') || !/^\s*\|[\s:|-]+\|\s*$/.test(linhas[i + 1])) continue
    const cab = celulas(linhas[i]).map((c) => c.toLowerCase())
    const col = (...nomes: string[]) => cab.findIndex((c) => nomes.includes(c))
    const cSlug = col('pasta', 'dossiê', 'dossie')
    if (cSlug < 0) continue
    const cData = col('data')
    const cServ = col('serviço', 'serviços', 'servico', 'servicos')
    const cStatus = col('status', 'estado')
    const cOrigem = col('origem')
    for (let j = i + 2; j < linhas.length && linhas[j].trim().startsWith('|'); j++) {
      const cel = celulas(linhas[j])
      const slug = /\[([^\]]+)\]/.exec(cel[cSlug] ?? '')?.[1] ?? cel[cSlug]
      if (!slug) continue
      r.set(slug, {
        data: cData >= 0 ? cel[cData] : undefined,
        servicos: cServ >= 0 ? cel[cServ] : undefined,
        status: cStatus >= 0 ? cel[cStatus] : undefined,
        origem: cOrigem >= 0 ? cel[cOrigem] : undefined,
      })
    }
  }
  return r
}

export function demanda(ws: string, dossie: string, suite?: SuiteLida, index?: Map<string, LinhaIndex>): Demanda {
  const [tipo, slug] = dossie.split('/')
  const s = suite ?? lerSuite(ws, dossie)
  const linha = (index ?? lerIndexTipo(ws, tipo)).get(slug) ?? {}
  const total = s.cenarios.length
  const repo = repositorio(ws)
  const ids = s.cenarios.map((c) => c.id)
  const [ambiente] = repo.ambientesComExecucao(dossie)
  const estado = ambiente ? repo.estadoAtual(dossie, ambiente, ids) : null
  const origem = linha.origem && !/^(nenhum|-|\u2014)?$/i.test(linha.origem) ? linha.origem : null
  return {
    dossie,
    tipo,
    slug,
    titulo: s.titulo || slug,
    data: linha.data || /^\d{4}-\d{2}-\d{2}/.exec(slug)?.[0] || '',
    servicos: linha.servicos ?? '',
    status: linha.status ?? '',
    origem,
    total_cenarios: total,
    ultima_rodada: repo.ultimaRodada(dossie, total),
    estado_atual: estado && { ambiente: estado.ambiente, atualizado_em: estado.atualizado_em, placar: estado.placar },
  }
}

export function listarDemandas(ws: string): Demanda[] {
  const base = join(ws, 'doc', 'demandas')
  const r: Demanda[] = []
  for (const tipo of readdirSync(base)) {
    const dirTipo = join(base, tipo)
    if (tipo.startsWith('.') || !statSync(dirTipo).isDirectory()) continue
    const index = lerIndexTipo(ws, tipo)
    for (const slug of readdirSync(dirTipo)) {
      if (!existsSync(join(dirTipo, slug, 'plano-teste.md'))) continue
      const dossie = `${tipo}/${slug}`
      r.push(demanda(ws, dossie, lerSuite(ws, dossie), index))
    }
  }
  return r.sort((a, b) => b.data.localeCompare(a.data) || a.dossie.localeCompare(b.dossie))
}
