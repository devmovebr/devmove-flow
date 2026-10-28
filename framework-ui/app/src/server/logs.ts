import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { EventoSessao, SessaoAgente, SituacaoSessao } from '../shared/tipos.ts'
import { lerCacheado, lerTrecho } from '../runner/arquivos.ts'
import { ErroRunner } from '../runner/erros.ts'
import { listarConversas } from './mensagens.ts'

// A ponte roda como clone dentro do workspace e apaga o bridge.pid ao sair.
const pastaPonte = (ws: string) => join(ws, '.agents-bridge', 'data')
const pastaLogs = (ws: string) => join(pastaPonte(ws), 'logs')
const ponteLigada = (ws: string) => existsSync(join(pastaPonte(ws), 'bridge.pid'))

export function arquivoSessao(ws: string, item: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(item)) throw new ErroRunner(`item inválido: ${item}`)
  const arq = join(pastaLogs(ws), `${item}.jsonl`)
  if (!existsSync(arq)) throw new ErroRunner(`sem log da sessão ${item}`, 404)
  return arq
}

// Linha incompleta no fim é a ponte no meio da escrita: fica para a próxima leitura.
export function parsearEventos(texto: string): EventoSessao[] {
  const eventos: EventoSessao[] = []
  for (const linha of texto.split('\n')) {
    if (!linha.trim()) continue
    try {
      eventos.push(JSON.parse(linha) as EventoSessao)
    } catch {
      // linha parcial
    }
  }
  return eventos
}

type Resumo = Pick<SessaoAgente, 'perguntas_abertas' | 'rodadas' | 'custo' | 'eventos'> & { ativa: boolean }

function resumir(eventos: EventoSessao[]): Resumo {
  const abertas = new Set<string>()
  let rodadas = 0
  let custo = 0
  let ativa = false
  for (const e of eventos) {
    if (e.kind === 'question' && e.id) abertas.add(e.id)
    else if (e.kind === 'answer' && e.id) abertas.delete(e.id)
    else if (e.kind === 'turn') {
      rodadas++
      custo += e.cost ?? 0
      ativa = false
    } else if (e.kind !== 'info') ativa = true
  }
  return { perguntas_abertas: abertas.size, rodadas, custo, eventos: eventos.length, ativa }
}

function tituloDoItem(ws: string, item: string): string | null {
  const bus = join(pastaLogs(ws), `${item}.bus.jsonl`)
  if (!existsSync(bus)) return null
  return lerCacheado(bus, (texto) => {
    for (const linha of texto.split('\n')) {
      if (!linha.includes('"item.created"')) continue
      try {
        const titulo = (JSON.parse(linha) as { envelope?: { payload?: { title?: unknown } } }).envelope?.payload?.title
        if (typeof titulo === 'string' && titulo) return titulo
      } catch {
        // linha parcial
      }
    }
    return null
  })
}

function dossiesPorItem(ws: string): Map<string, string> {
  try {
    return new Map(listarConversas(ws).flatMap((c) => (c.item ? [[c.item, c.dossie] as const] : [])))
  } catch {
    return new Map()
  }
}

export function listarSessoes(ws: string): SessaoAgente[] {
  const dir = pastaLogs(ws)
  if (!existsSync(dir)) return []
  const ligada = ponteLigada(ws)
  const dossies = dossiesPorItem(ws)
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl') && !f.endsWith('.bus.jsonl'))
    .map((f): SessaoAgente => {
      const arq = join(dir, f)
      const item = f.slice(0, -'.jsonl'.length)
      const { ativa, ...resumo } = lerCacheado(arq, (texto) => resumir(parsearEventos(texto)))
      const situacao: SituacaoSessao = resumo.perguntas_abertas ? 'aguardando' : ativa && ligada ? 'executando' : 'parada'
      return {
        item,
        titulo: tituloDoItem(ws, item),
        dossie: dossies.get(item) ?? null,
        situacao,
        ...resumo,
        atualizada_em: statSync(arq).mtime.toISOString(),
      }
    })
    .sort((a, b) => b.atualizada_em.localeCompare(a.atualizada_em))
}

// Eventos completos desde o byte `de`; `ate` = -1 quando a ponte recriou o arquivo.
export function lerDesde(arq: string, de: number): { eventos: EventoSessao[]; ate: number } {
  const { texto, ate } = lerTrecho(arq, de)
  return { eventos: parsearEventos(texto), ate }
}
