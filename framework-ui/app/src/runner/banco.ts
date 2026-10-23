import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { EstadoAtual, Execucao, Placar, Rodada, Veredito } from '../shared/tipos.ts'
import { migracoes } from './migracoes.ts'

const abertos = new Map<string, DatabaseSync>()

export function abrirBanco(ws: string): DatabaseSync {
  const existente = abertos.get(ws)
  if (existente) return existente
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
  abertos.set(ws, db)
  return db
}

type LinhaRodada = Omit<Rodada, 'placar'>
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

export type ExecucaoCompleta = Execucao & { cenario_md: string }

function paraExecucao(l: LinhaExecucao): ExecucaoCompleta {
  return {
    id: l.id,
    rodada_id: l.rodada_id,
    cenario: l.cenario,
    titulo: l.titulo,
    ordem: l.ordem,
    cenario_md: l.cenario_md,
    request: JSON.parse(l.request),
    resposta: l.resposta ? JSON.parse(l.resposta) : null,
    erro: l.erro,
    assercoes: JSON.parse(l.assercoes),
    veredito: l.veredito,
    veredito_auto: l.veredito_auto,
    nota: l.nota,
    executada_em: l.executada_em,
  }
}

export function semMd(e: ExecucaoCompleta): Execucao {
  const { cenario_md: _, ...resto } = e
  return resto
}

export class Repositorio {
  db: DatabaseSync
  constructor(db: DatabaseSync) {
    this.db = db
  }

  placar(rodadaId: number, total: number): Placar {
    const linhas = this.db
      .prepare('select veredito, count(*) as n from execucoes where rodada_id = ? group by veredito')
      .all(rodadaId) as { veredito: Veredito; n: number }[]
    return placarDe(linhas, total)
  }

  // Ambientes ordenados pela execução mais recente.
  ambientesComExecucao(dossie: string): string[] {
    return (
      this.db
        .prepare(
          `select r.ambiente from execucoes e join rodadas r on r.id = e.rodada_id
           where r.dossie = ? group by r.ambiente order by max(e.executada_em) desc`,
        )
        .all(dossie) as { ambiente: string }[]
    ).map((l) => l.ambiente)
  }

  estadoAtual(dossie: string, ambiente: string, cenarios: string[]): EstadoAtual | null {
    const linhas = this.db
      .prepare(
        `select e.* from execucoes e join rodadas r on r.id = e.rodada_id
         where r.dossie = ? and r.ambiente = ? order by e.executada_em desc, e.id desc`,
      )
      .all(dossie, ambiente) as LinhaExecucao[]
    const ultimas = new Map<string, LinhaExecucao>()
    for (const l of linhas) if (cenarios.includes(l.cenario) && !ultimas.has(l.cenario)) ultimas.set(l.cenario, l)
    if (!ultimas.size) return null
    const rodadas = new Map<number, Rodada>()
    const execucoes = [...ultimas.values()]
      .map((l) => {
        if (!rodadas.has(l.rodada_id)) rodadas.set(l.rodada_id, this.rodada(l.rodada_id, cenarios.length)!)
        return { ...semMd(paraExecucao(l)), rodada: rodadas.get(l.rodada_id) }
      })
      .sort((a, b) => a.ordem - b.ordem)
    const contagem = new Map<Veredito, number>()
    for (const e of execucoes) contagem.set(e.veredito, (contagem.get(e.veredito) ?? 0) + 1)
    return {
      ambiente,
      atualizado_em: execucoes.reduce((m, e) => (e.executada_em > m ? e.executada_em : m), ''),
      placar: placarDe([...contagem].map(([veredito, n]) => ({ veredito, n })), cenarios.length),
      execucoes,
    }
  }

  estados(dossie: string, cenarios: string[]): EstadoAtual[] {
    return this.ambientesComExecucao(dossie)
      .map((a) => this.estadoAtual(dossie, a, cenarios))
      .filter((e) => e !== null)
  }

  private comPlacar(l: LinhaRodada | undefined, total: number): Rodada | null {
    return l ? { ...l, placar: this.placar(l.id, total) } : null
  }

  rodada(id: number, total: number): Rodada | null {
    return this.comPlacar(this.db.prepare('select * from rodadas where id = ?').get(id) as LinhaRodada | undefined, total)
  }

  rodadas(dossie: string, total: number, ambiente?: string): Rodada[] {
    const linhas = (
      ambiente
        ? this.db.prepare('select * from rodadas where dossie = ? and ambiente = ? order by id desc').all(dossie, ambiente)
        : this.db.prepare('select * from rodadas where dossie = ? order by id desc').all(dossie)
    ) as LinhaRodada[]
    return linhas.map((l) => this.comPlacar(l, total)!)
  }

  ultimaRodada(dossie: string, total: number): Rodada | null {
    return this.comPlacar(
      this.db.prepare('select * from rodadas where dossie = ? order by id desc limit 1').get(dossie) as LinhaRodada | undefined,
      total,
    )
  }

  emExecucao(dossie: string): LinhaRodada | undefined {
    return this.db
      .prepare("select * from rodadas where dossie = ? and status = 'executando' order by id desc limit 1")
      .get(dossie) as LinhaRodada | undefined
  }

  ultimaAtividade(rodadaId: number): string {
    const r = this.db
      .prepare('select max(executada_em) as m from execucoes where rodada_id = ?')
      .get(rodadaId) as { m: string | null }
    return r.m ?? ''
  }

  criarRodada(r: Omit<LinhaRodada, 'id' | 'status' | 'finalizada_em'>): number {
    const res = this.db
      .prepare("insert into rodadas (dossie, ambiente, origem, autor, status, iniciada_em) values (?, ?, ?, ?, 'executando', ?)")
      .run(r.dossie, r.ambiente, r.origem, r.autor, r.iniciada_em)
    return Number(res.lastInsertRowid)
  }

  finalizarRodada(id: number, status: Rodada['status']): void {
    this.db.prepare('update rodadas set status = ?, finalizada_em = ? where id = ?').run(status, new Date().toISOString(), id)
  }

  inserirExecucao(e: Omit<ExecucaoCompleta, 'id'>): number {
    const res = this.db
      .prepare(
        `insert into execucoes (rodada_id, cenario, titulo, ordem, cenario_md, request, resposta, erro, assercoes,
          veredito, veredito_auto, nota, executada_em) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
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
    const l = this.db.prepare('select * from execucoes where id = ?').get(id) as LinhaExecucao | undefined
    return l ? paraExecucao(l) : null
  }

  execucoesDaRodada(rodadaId: number): ExecucaoCompleta[] {
    return (this.db.prepare('select * from execucoes where rodada_id = ? order by ordem, id').all(rodadaId) as LinhaExecucao[]).map(
      paraExecucao,
    )
  }

  execucoesDoDossie(dossie: string, ambiente?: string): (ExecucaoCompleta & { ambiente: string })[] {
    const sql = `select e.*, r.ambiente from execucoes e join rodadas r on r.id = e.rodada_id
      where r.dossie = ? ${ambiente ? 'and r.ambiente = ?' : ''} order by e.executada_em desc, e.id desc`
    const args = ambiente ? [dossie, ambiente] : [dossie]
    return (this.db.prepare(sql).all(...args) as (LinhaExecucao & { ambiente: string })[]).map((l) => ({
      ...paraExecucao(l),
      ambiente: l.ambiente,
    }))
  }

  historico(dossie: string, cenario: string): ExecucaoCompleta[] {
    return (
      this.db
        .prepare(
          `select e.* from execucoes e join rodadas r on r.id = e.rodada_id
           where r.dossie = ? and e.cenario = ? order by e.executada_em desc, e.id desc`,
        )
        .all(dossie, cenario) as LinhaExecucao[]
    ).map(paraExecucao)
  }

  ultimaExecucao(dossie: string, ambiente: string, cenario: string): ExecucaoCompleta | null {
    const l = this.db
      .prepare(
        `select e.* from execucoes e join rodadas r on r.id = e.rodada_id
         where r.dossie = ? and r.ambiente = ? and e.cenario = ? order by e.executada_em desc, e.id desc limit 1`,
      )
      .get(dossie, ambiente, cenario) as LinhaExecucao | undefined
    return l ? paraExecucao(l) : null
  }

  mudarVeredito(id: number, veredito: Veredito, nota: string | null): void {
    this.db.prepare('update execucoes set veredito = ?, nota = ? where id = ?').run(veredito, nota, id)
  }
}

export function repositorio(ws: string): Repositorio {
  return new Repositorio(abrirBanco(ws))
}

function placarDe(linhas: { veredito: Veredito; n: number }[], total: number): Placar {
  const p: Placar = { passou: 0, falhou: 0, bloqueado: 0, pendente: 0, nao_executado: 0, total }
  let feitos = 0
  for (const l of linhas) {
    feitos += l.n
    if (l.veredito === 'PASSOU') p.passou = l.n
    else if (l.veredito === 'FALHOU') p.falhou = l.n
    else if (l.veredito === 'BLOQUEADO') p.bloqueado = l.n
    else p.pendente = l.n
  }
  p.nao_executado = Math.max(0, total - feitos)
  return p
}
