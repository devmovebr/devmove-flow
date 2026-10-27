import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync, type StatementSync } from 'node:sqlite'
import { type Contagem, contarPlacar, placarDe } from '../shared/placar.ts'
import type { EstadoAtual, Execucao, ExecucaoResumo, Rodada, Veredito } from '../shared/tipos.ts'
import { migracoes } from './migracoes.ts'

function abrirBanco(ws: string): DatabaseSync {
  const dir = join(ws, '.devmove')
  mkdirSync(dir, { recursive: true })
  const db = new DatabaseSync(join(dir, 'devmove.db'))
  db.exec('pragma journal_mode = wal; pragma busy_timeout = 5000; pragma foreign_keys = on;')
  db.exec('create table if not exists migracoes (versao integer primary key, aplicada_em text not null)')
  const aplicadas = new Set(
    (db.prepare('select versao from migracoes').all() as { versao: number }[]).map((r) => r.versao),
  )
  for (const m of migracoes) {
    if (aplicadas.has(m.versao)) continue
    db.exec('begin')
    try {
      db.exec(m.sql)
      db.prepare('insert into migracoes (versao, aplicada_em) values (?, ?)').run(m.versao, new Date().toISOString())
      db.exec('commit')
    } catch (e) {
      db.exec('rollback')
      throw e
    }
  }
  return db
}

type LinhaRodada = Omit<Rodada, 'placar'> & Contagem
type LinhaExecucao = {
  id: number
  rodada_id: number
  cenario: string
  titulo: string
  ordem: number
  cenario_md: string
  request: string
  resposta: string | null
  erro: string | null
  assercoes: string
  veredito: Veredito
  veredito_auto: Veredito
  nota: string | null
  executada_em: string
}
type LinhaResumo = Omit<ExecucaoResumo, 'resposta' | 'rodada'> & { ambiente: string; status: number | null; tempo_ms: number | null }

export type ExecucaoCompleta = Execucao & { cenario_md: string }

function paraExecucao(l: LinhaExecucao): ExecucaoCompleta {
  return {
    ...l,
    request: JSON.parse(l.request),
    resposta: l.resposta ? JSON.parse(l.resposta) : null,
    assercoes: JSON.parse(l.assercoes),
  }
}

function paraRodada({ passou, falhou, bloqueado, pendente, ...r }: LinhaRodada, total: number): Rodada {
  return { ...r, placar: placarDe({ passou, falhou, bloqueado, pendente }, total) }
}

export function semMd(e: ExecucaoCompleta): Execucao {
  const { cenario_md: _, ...resto } = e
  return resto
}

// Rodada com a contagem por veredito agregada na mesma consulta.
const RODADA = `select r.*,
    count(e.id) filter (where e.veredito = 'PASSOU') as passou,
    count(e.id) filter (where e.veredito = 'FALHOU') as falhou,
    count(e.id) filter (where e.veredito = 'BLOQUEADO') as bloqueado,
    count(e.id) filter (where e.veredito not in ('PASSOU', 'FALHOU', 'BLOQUEADO')) as pendente
  from rodadas r left join execucoes e on e.rodada_id = r.id`

// Posição de cada execução entre as do mesmo cenário e ambiente; n = 1 é a mais recente.
const ULTIMAS = `select e.id, r.ambiente,
    row_number() over (partition by r.ambiente, e.cenario order by e.executada_em desc, e.id desc) as n
  from execucoes e join rodadas r on r.id = e.rodada_id
  where r.dossie = :dossie and (:ambiente is null or r.ambiente = :ambiente)`

export class Repositorio {
  private readonly db: DatabaseSync
  private readonly preparadas = new Map<string, StatementSync>()

  constructor(db: DatabaseSync) {
    this.db = db
  }

  private sql(texto: string): StatementSync {
    let s = this.preparadas.get(texto)
    if (!s) this.preparadas.set(texto, (s = this.db.prepare(texto)))
    return s
  }

  rodada(id: number, total: number): Rodada | null {
    const l = this.sql(`${RODADA} where r.id = ? group by r.id`).get(id) as LinhaRodada | undefined
    return l ? paraRodada(l, total) : null
  }

  rodadas(dossie: string, total: number, ambiente?: string): Rodada[] {
    const linhas = this.sql(`${RODADA} where r.dossie = :dossie and (:ambiente is null or r.ambiente = :ambiente) group by r.id order by r.id desc`)
      .all({ dossie, ambiente: ambiente ?? null }) as LinhaRodada[]
    return linhas.map((l) => paraRodada(l, total))
  }

  rodadasPorId(ids: Iterable<number>, total: number): Map<number, Rodada> {
    const linhas = this.sql(`${RODADA} where r.id in (select value from json_each(?)) group by r.id`)
      .all(JSON.stringify([...new Set(ids)])) as LinhaRodada[]
    return new Map(linhas.map((l) => [l.id, paraRodada(l, total)]))
  }

  ultimaRodada(dossie: string, total: number): Rodada | null {
    const l = this.sql(`${RODADA} where r.dossie = ? group by r.id order by r.id desc limit 1`).get(dossie) as LinhaRodada | undefined
    return l ? paraRodada(l, total) : null
  }

  // Um estado por ambiente, o de execução mais recente primeiro. Só entram cenários que ainda estão no plano.
  estados(dossie: string, cenarios: string[]): EstadoAtual[] {
    const linhas = this.sql(
      `select u.ambiente, e.id, e.rodada_id, e.cenario, e.titulo, e.ordem, e.veredito, e.executada_em,
         json_extract(e.resposta, '$.status') as status, json_extract(e.resposta, '$.tempo_ms') as tempo_ms
       from (${ULTIMAS}) u join execucoes e on e.id = u.id where u.n = 1`,
    ).all({ dossie, ambiente: null }) as LinhaResumo[]
    const noPlano = new Set(cenarios)
    const porAmbiente = Map.groupBy(
      linhas.filter((l) => noPlano.has(l.cenario)),
      (l) => l.ambiente,
    )
    const rodadas = this.rodadasPorId(
      linhas.map((l) => l.rodada_id),
      cenarios.length,
    )
    return [...porAmbiente]
      .map(([ambiente, ls]): EstadoAtual => {
        const execucoes = ls
          .sort((a, b) => a.ordem - b.ordem)
          .map((l): ExecucaoResumo => {
            const { ambiente: _, status, tempo_ms, ...e } = l
            return { ...e, resposta: status === null ? null : { status, tempo_ms: tempo_ms ?? 0 }, rodada: rodadas.get(e.rodada_id) }
          })
        return {
          ambiente,
          atualizado_em: execucoes.reduce((m, e) => (e.executada_em > m ? e.executada_em : m), ''),
          placar: contarPlacar(
            execucoes.map((e) => e.veredito),
            cenarios.length,
          ),
          execucoes,
        }
      })
      .sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))
  }

  ultimasExecucoes(dossie: string, ambiente: string): ExecucaoCompleta[] {
    const linhas = this.sql(`select e.* from (${ULTIMAS}) u join execucoes e on e.id = u.id where u.n = 1`).all({ dossie, ambiente }) as LinhaExecucao[]
    return linhas.map(paraExecucao)
  }

  vereditos(dossie: string, ambiente?: string): Pick<Execucao, 'rodada_id' | 'cenario' | 'titulo' | 'veredito'>[] {
    return this.sql(
      `select e.rodada_id, e.cenario, e.titulo, e.veredito from execucoes e join rodadas r on r.id = e.rodada_id
       where r.dossie = :dossie and (:ambiente is null or r.ambiente = :ambiente) order by e.rodada_id, e.ordem, e.id`,
    ).all({ dossie, ambiente: ambiente ?? null }) as Pick<Execucao, 'rodada_id' | 'cenario' | 'titulo' | 'veredito'>[]
  }

  localDaRodada(id: number): Pick<Rodada, 'dossie' | 'ambiente'> | undefined {
    return this.sql('select dossie, ambiente from rodadas where id = ?').get(id) as Pick<Rodada, 'dossie' | 'ambiente'> | undefined
  }

  emExecucao(dossie: string): Omit<Rodada, 'placar'> | undefined {
    return this.sql("select * from rodadas where dossie = ? and status = 'executando' order by id desc limit 1").get(dossie) as
      | Omit<Rodada, 'placar'>
      | undefined
  }

  ultimaAtividade(rodadaId: number): string {
    const r = this.sql('select max(executada_em) as m from execucoes where rodada_id = ?').get(rodadaId) as { m: string | null }
    return r.m ?? ''
  }

  criarRodada(r: Pick<Rodada, 'dossie' | 'ambiente' | 'origem' | 'autor' | 'iniciada_em'>): number {
    const res = this.sql("insert into rodadas (dossie, ambiente, origem, autor, status, iniciada_em) values (?, ?, ?, ?, 'executando', ?)").run(
      r.dossie,
      r.ambiente,
      r.origem,
      r.autor,
      r.iniciada_em,
    )
    return Number(res.lastInsertRowid)
  }

  finalizarRodada(id: number, status: Rodada['status']): void {
    this.sql('update rodadas set status = ?, finalizada_em = ? where id = ?').run(status, new Date().toISOString(), id)
  }

  inserirExecucao(e: Omit<ExecucaoCompleta, 'id'>): number {
    const res = this.sql(
      `insert into execucoes (rodada_id, cenario, titulo, ordem, cenario_md, request, resposta, erro, assercoes,
        veredito, veredito_auto, nota, executada_em) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      e.rodada_id,
      e.cenario,
      e.titulo,
      e.ordem,
      e.cenario_md,
      JSON.stringify(e.request),
      e.resposta ? JSON.stringify(e.resposta) : null,
      e.erro,
      JSON.stringify(e.assercoes),
      e.veredito,
      e.veredito_auto,
      e.nota,
      e.executada_em,
    )
    return Number(res.lastInsertRowid)
  }

  execucao(id: number): ExecucaoCompleta | null {
    const l = this.sql('select * from execucoes where id = ?').get(id) as LinhaExecucao | undefined
    return l ? paraExecucao(l) : null
  }

  execucoesDaRodada(rodadaId: number): ExecucaoCompleta[] {
    return (this.sql('select * from execucoes where rodada_id = ? order by ordem, id').all(rodadaId) as LinhaExecucao[]).map(paraExecucao)
  }

  historico(dossie: string, cenario: string): ExecucaoCompleta[] {
    return (
      this.sql(
        `select e.* from execucoes e join rodadas r on r.id = e.rodada_id
         where r.dossie = ? and e.cenario = ? order by e.executada_em desc, e.id desc`,
      ).all(dossie, cenario) as LinhaExecucao[]
    ).map(paraExecucao)
  }

  ultimaExecucao(dossie: string, ambiente: string, cenario: string): ExecucaoCompleta | null {
    const l = this.sql(
      `select e.* from execucoes e join rodadas r on r.id = e.rodada_id
       where r.dossie = ? and r.ambiente = ? and e.cenario = ? order by e.executada_em desc, e.id desc limit 1`,
    ).get(dossie, ambiente, cenario) as LinhaExecucao | undefined
    return l ? paraExecucao(l) : null
  }

  mudarVeredito(id: number, veredito: Veredito, nota: string | null): void {
    this.sql('update execucoes set veredito = ?, nota = ? where id = ?').run(veredito, nota, id)
  }
}

const repositorios = new Map<string, Repositorio>()

export function repositorio(ws: string): Repositorio {
  let r = repositorios.get(ws)
  if (!r) repositorios.set(ws, (r = new Repositorio(abrirBanco(ws))))
  return r
}
