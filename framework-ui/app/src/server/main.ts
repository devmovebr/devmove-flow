import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyError } from 'fastify'
import type { Execucao, Info, Matriz, Requisicao, Rodada } from '../shared/tipos.ts'
import { repositorio, semMd } from '../runner/banco.ts'
import { ErroRunner, envioAvulso, iniciarRodada, mudarVeredito } from '../runner/executor.ts'
import { listarAmbientes } from '../runner/variaveis.ts'
import { demanda, lerProjetosRegistrados, lerSuite, listarDemandas, listarProjetos } from '../runner/workspaces.ts'
import { lerConversa, listarConversas } from './mensagens.ts'

function raizApp(): string {
  let dir = import.meta.dirname
  while (!existsSync(join(dir, 'package.json')) && dirname(dir) !== dir) dir = dirname(dir)
  return dir
}

const APP = raizApp()
const PORTA = Number(process.env.PORT ?? 4800)
const WORKSPACES = resolve(process.env.DEVMOVE_WORKSPACES ?? join(APP, '..', '..'))
const REGISTRO = process.env.DEVMOVE_PROJETOS
const USUARIO = process.env.DEVMOVE_USUARIO || process.env.USER || 'pessoa'
const VERSAO = process.env.DEVMOVE_VERSAO ?? 'dev'
const WEB = join(APP, 'dist', 'web')

const projetos = () => (REGISTRO ? lerProjetosRegistrados(REGISTRO) : listarProjetos(WORKSPACES))

type Ativa = { emissor: EventEmitter; ctrl: AbortController }
const ativas = new Map<string, Ativa>()

function projeto(p: string): string {
  const achado = projetos().find((x) => x.nome === p)
  if (!achado) throw new ErroRunner(`projeto não encontrado: ${p}`, 404)
  return achado.caminho
}

function dossieDe(d: string): string {
  const dossie = decodeURIComponent(d)
  if (!/^[^/.][^/]*\/[^/.][^/]*$/.test(dossie)) throw new ErroRunner(`dossiê inválido: ${dossie}`)
  return dossie
}

function totalCenarios(ws: string, dossie: string): number {
  try {
    return lerSuite(ws, dossie).cenarios.length
  } catch {
    return 0
  }
}

function rodadaCompleta(ws: string, id: number): Rodada & { execucoes: Execucao[] } {
  const repo = repositorio(ws)
  const base = repo.db.prepare('select dossie from rodadas where id = ?').get(id) as { dossie: string } | undefined
  if (!base) throw new ErroRunner(`rodada #${id} não existe`, 404)
  const rodada = repo.rodada(id, totalCenarios(ws, base.dossie))!
  return { ...rodada, execucoes: repo.execucoesDaRodada(id).map(semMd) }
}

const app = Fastify({ logger: { level: process.env.LOG ?? 'warn' } })

app.setErrorHandler((err: FastifyError | ErroRunner, _req, reply) => {
  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500
  if (status >= 500) app.log.error(err)
  reply.status(status).send({ erro: err.message })
})

app.get('/api/info', async (): Promise<Info> => ({ usuario: USUARIO, versao: VERSAO }))

app.get('/api/projetos', async () => projetos())

app.get<{ Params: { p: string } }>('/api/projetos/:p/ambientes', async (req) => listarAmbientes(projeto(req.params.p)))

app.get<{ Params: { p: string } }>('/api/projetos/:p/demandas', async (req) => listarDemandas(projeto(req.params.p)))

app.get<{ Params: { p: string } }>('/api/projetos/:p/mensagens', async (req) => listarConversas(projeto(req.params.p)))

app.get<{ Params: { p: string; d: string } }>('/api/projetos/:p/mensagens/:d', async (req) =>
  lerConversa(projeto(req.params.p), dossieDe(req.params.d)),
)

app.get<{ Params: { p: string; d: string } }>('/api/projetos/:p/demandas/:d', async (req) => {
  const ws = projeto(req.params.p)
  const dossie = dossieDe(req.params.d)
  const { trechos: _, ...suite } = lerSuite(ws, dossie)
  return {
    demanda: demanda(ws, dossie, { ...suite, trechos: {} }),
    suite,
    rodadas: repositorio(ws).rodadas(dossie, suite.cenarios.length),
    estados: repositorio(ws).estados(
      dossie,
      suite.cenarios.map((c) => c.id),
    ),
  }
})

app.get<{ Params: { p: string; d: string }; Querystring: { ambiente?: string } }>(
  '/api/projetos/:p/demandas/:d/matriz',
  async (req): Promise<Matriz> => {
    const ws = projeto(req.params.p)
    const dossie = dossieDe(req.params.d)
    const suite = lerSuite(ws, dossie)
    const repo = repositorio(ws)
    const rodadas = repo.rodadas(dossie, suite.cenarios.length, req.query.ambiente || undefined).reverse()
    const linhas: Matriz['linhas'] = suite.cenarios.map((c) => ({ cenario: c.id, titulo: c.titulo, vereditos: {} }))
    for (const r of rodadas) {
      for (const e of repo.execucoesDaRodada(r.id)) {
        let linha = linhas.find((l) => l.cenario === e.cenario)
        if (!linha) linhas.push((linha = { cenario: e.cenario, titulo: e.titulo, vereditos: {} }))
        linha.vereditos[r.id] = e.veredito
      }
    }
    return { rodadas, linhas }
  },
)

app.get<{ Params: { p: string; d: string; c: string } }>('/api/projetos/:p/demandas/:d/cenarios/:c/historico', async (req) => {
  const ws = projeto(req.params.p)
  const dossie = dossieDe(req.params.d)
  const repo = repositorio(ws)
  const total = totalCenarios(ws, dossie)
  const cache = new Map<number, Rodada>()
  return repo.historico(dossie, req.params.c.toUpperCase()).map((e) => {
    if (!cache.has(e.rodada_id)) cache.set(e.rodada_id, repo.rodada(e.rodada_id, total)!)
    return { ...semMd(e), rodada: cache.get(e.rodada_id) }
  })
})

app.post<{ Params: { p: string; d: string }; Body: { ambiente?: string; cenarios?: string[] } }>(
  '/api/projetos/:p/demandas/:d/executar',
  async (req) => {
    const ws = projeto(req.params.p)
    const dossie = dossieDe(req.params.d)
    const { ambiente, cenarios } = req.body ?? {}
    if (!ambiente) throw new ErroRunner('informe o ambiente')
    const emissor = new EventEmitter()
    const ctrl = new AbortController()
    const r = iniciarRodada({
      ws,
      dossie,
      ambiente,
      cenarios,
      autor: USUARIO,
      origem: 'manual',
      sinal: ctrl.signal,
      aoExecutar: (e) => emissor.emit('execucao', e),
      aoTerminar: (rodada) => emissor.emit('fim', rodada),
    })
    const chave = `${req.params.p}:${r.rodada_id}`
    ativas.set(chave, { emissor, ctrl })
    r.fim
      .catch((e) => {
        app.log.error(e)
        emissor.emit('fim', repositorio(ws).rodada(r.rodada_id, totalCenarios(ws, dossie)))
      })
      .finally(() => setTimeout(() => ativas.delete(chave), 1000))
    return { rodada_id: r.rodada_id }
  },
)

app.get<{ Params: { p: string; id: string } }>('/api/projetos/:p/rodadas/:id', async (req) =>
  rodadaCompleta(projeto(req.params.p), Number(req.params.id)),
)

app.get<{ Params: { p: string; id: string } }>('/api/projetos/:p/rodadas/:id/eventos', (req, reply) => {
  const ws = projeto(req.params.p)
  const id = Number(req.params.id)
  const atual = rodadaCompleta(ws, id)
  reply.hijack()
  const res = reply.raw
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
  const enviarEvento = (evento: string, dados: unknown) => res.write(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`)
  const { execucoes, ...rodada } = atual
  const enviados = new Set<number>()
  for (const e of execucoes) {
    enviados.add(e.id)
    enviarEvento('execucao', e)
  }
  const ativa = ativas.get(`${req.params.p}:${id}`)
  if (!ativa || rodada.status !== 'executando') {
    enviarEvento('fim', rodada)
    res.end()
    return
  }
  const aoExecutar = (e: Execucao) => {
    if (!enviados.has(e.id)) enviarEvento('execucao', e)
  }
  const aoFim = (r: Rodada) => {
    enviarEvento('fim', r)
    limpar()
    res.end()
  }
  const pulso = setInterval(() => res.write(': pulso\n\n'), 15_000)
  const limpar = () => {
    clearInterval(pulso)
    ativa.emissor.off('execucao', aoExecutar)
    ativa.emissor.off('fim', aoFim)
  }
  ativa.emissor.on('execucao', aoExecutar)
  ativa.emissor.on('fim', aoFim)
  req.raw.on('close', limpar)
})

app.post<{ Params: { p: string; id: string } }>('/api/projetos/:p/rodadas/:id/parar', async (req) => {
  const ws = projeto(req.params.p)
  const id = Number(req.params.id)
  const atual = rodadaCompleta(ws, id)
  const ativa = ativas.get(`${req.params.p}:${id}`)
  if (ativa) {
    ativa.ctrl.abort()
    const fim = await new Promise<Rodada>((ok) => ativa.emissor.once('fim', ok))
    return fim
  }
  if (atual.status === 'executando') repositorio(ws).finalizarRodada(id, 'interrompida')
  const { execucoes: _, ...rodada } = rodadaCompleta(ws, id)
  return rodada
})

app.patch<{ Params: { p: string; id: string }; Body: { veredito?: string; nota?: string | null } }>(
  '/api/projetos/:p/execucoes/:id',
  async (req) => mudarVeredito(projeto(req.params.p), Number(req.params.id), req.body?.veredito ?? '', req.body?.nota ?? null),
)

app.post<{
  Params: { p: string }
  Body: { ambiente?: string; dossie?: string; cenario?: string; request?: Requisicao; env?: Record<string, string> }
}>('/api/projetos/:p/enviar', async (req) => {
  const ws = projeto(req.params.p)
  const b = req.body ?? {}
  if (!b.ambiente) throw new ErroRunner('informe o ambiente')
  if (!b.request?.url) throw new ErroRunner('informe request.url')
  return envioAvulso({
    ws,
    ambiente: b.ambiente,
    dossie: b.dossie ? dossieDe(b.dossie) : undefined,
    cenario: b.cenario?.toUpperCase(),
    request: b.request,
    env: b.env,
  })
})

if (existsSync(WEB)) {
  await app.register(fastifyStatic, { root: WEB, wildcard: false })
}

app.setNotFoundHandler((req, reply) => {
  if (req.method === 'GET' && !req.url.startsWith('/api') && existsSync(join(WEB, 'index.html'))) {
    return reply.sendFile('index.html')
  }
  reply.status(404).send({ erro: `rota não encontrada: ${req.method} ${req.url}` })
})

await app.listen({ port: PORTA, host: process.env.HOST ?? '0.0.0.0' })
console.log(`DevMove Painel em http://localhost:${PORTA} · projetos de ${REGISTRO ?? WORKSPACES}`)
