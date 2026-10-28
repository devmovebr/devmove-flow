import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SituacaoApp, Subida } from '../../shared/tipos.ts'
import { garantirPastas, pastas } from './config.ts'

// Histórico em JSONL só de acréscimo, não no SQLite: quem grava é o host e quem lê é a UI no container, e o
// WAL do SQLite não é coerente entre os dois lados do volume do Docker Desktop. Texto acrescentado é.
const arquivo = (ws: string) => join(pastas(ws).raiz, 'subidas.jsonl')

type Linha = { id: string; app: string; autor?: string; iniciada_em?: string; finalizada_em?: string; situacao_final?: SituacaoApp; codigo_saida?: number | null }

const gravar = (ws: string, l: Linha) => {
  garantirPastas(ws)
  appendFileSync(arquivo(ws), `${JSON.stringify(l)}\n`)
}

export function criarSubida(ws: string, app: string, autor: string, iniciada_em: string): string {
  const id = `${app}-${Date.parse(iniciada_em)}`
  gravar(ws, { id, app, autor, iniciada_em })
  return id
}

export function finalizarSubida(ws: string, id: string, app: string, situacao: SituacaoApp, codigo: number | null): void {
  gravar(ws, { id, app, finalizada_em: new Date().toISOString(), situacao_final: situacao, codigo_saida: codigo })
}

export function subidas(ws: string, app: string, limite = 20): Subida[] {
  if (!existsSync(arquivo(ws))) return []
  const porId = new Map<string, Subida>()
  for (const texto of readFileSync(arquivo(ws), 'utf8').split('\n')) {
    let l: Linha
    try {
      l = JSON.parse(texto) as Linha
    } catch {
      continue
    }
    if (l.app !== app) continue
    if (l.iniciada_em)
      porId.set(l.id, { id: l.id, app, autor: l.autor ?? '', iniciada_em: l.iniciada_em, finalizada_em: null, situacao_final: null, codigo_saida: null })
    else {
      const s = porId.get(l.id)
      if (s && !s.finalizada_em) Object.assign(s, { finalizada_em: l.finalizada_em, situacao_final: l.situacao_final, codigo_saida: l.codigo_saida ?? null })
    }
  }
  return [...porId.values()].reverse().slice(0, limite)
}
