import type { Cenario, EnvioResultado, Execucao, Requisicao, Rodada, Veredito } from '../shared/tipos.ts'
import { avaliar, vereditoAuto } from './assercoes.ts'
import { repositorio, semMd } from './banco.ts'
import { ErroRunner } from './erros.ts'
import { gerarEvidencia } from './evidencia.ts'
import { enviar } from './http.ts'
import { type Variaveis, listarAmbientes, mascarar, resolverRequisicao, resolverVariaveis } from './variaveis.ts'
import { lerSuite } from './workspaces.ts'

export { ErroRunner }

const RODADA_ORFA_MS = 5 * 60 * 1000

export type OpcoesRodada = {
  ws: string
  dossie: string
  ambiente: string
  cenarios?: string[]
  autor: string
  origem?: Rodada['origem']
  sinal?: AbortSignal
  aoExecutar?: (e: Execucao, c: Cenario) => void
  aoPular?: (c: Cenario) => void
  aoTerminar?: (r: Rodada) => void
}

function mascararResposta<T extends EnvioResultado['resposta']>(r: T, v: Variaveis): T {
  if (!r) return r
  return { ...r, body: mascarar(r.body, v), headers: r.headers.map(([k, val]) => [k, mascarar(val, v)]) }
}

async function rodarCenario(ws: string, amb: string, camadas: Parameters<typeof resolverVariaveis>[2], req: Requisicao, assercoes: string[], sinal?: AbortSignal): Promise<EnvioResultado> {
  let v: Variaveis
  try {
    v = await resolverVariaveis(ws, amb, camadas)
  } catch (e) {
    return { request: req, resposta: null, erro: (e as Error).message, assercoes: avaliar(assercoes, null) }
  }
  const real = resolverRequisicao(req, v)
  const gravada = resolverRequisicao(req, v, true).req
  if (real.faltando.length) {
    return { request: gravada, resposta: null, erro: `variável faltando: ${real.faltando.join(', ')}`, assercoes: avaliar(assercoes, null) }
  }
  const { resposta, erro } = await enviar(real.req, sinal)
  return {
    request: gravada,
    resposta: mascararResposta(resposta, v),
    erro: erro && mascarar(erro, v),
    assercoes: avaliar(assercoes, resposta),
  }
}

// Valida e cria a rodada; a execução segue em `fim`.
export function iniciarRodada(o: OpcoesRodada): { rodada_id: number; fim: Promise<Rodada> } {
  const suite = lerSuite(o.ws, o.dossie)
  const repo = repositorio(o.ws)
  let cenarios = suite.cenarios
  if (o.cenarios?.length) {
    const pedidos = o.cenarios.map((c) => c.trim().toUpperCase())
    const faltam = pedidos.filter((p) => !cenarios.some((c) => c.id === p))
    if (faltam.length) throw new ErroRunner(`cenário não existe no plano: ${faltam.join(', ')}`)
    cenarios = cenarios.filter((c) => pedidos.includes(c.id))
  }
  conferirAmbiente(o.ws, o.ambiente)

  const ativa = repo.emExecucao(o.dossie)
  if (ativa) {
    const atividade = repo.ultimaAtividade(ativa.id) || ativa.iniciada_em
    if (Date.now() - Date.parse(atividade) < RODADA_ORFA_MS) {
      throw new ErroRunner(`rodada #${ativa.id} ainda em execução neste dossiê`, 409)
    }
    repo.finalizarRodada(ativa.id, 'interrompida')
  }

  const rodadaId = repo.criarRodada({
    dossie: o.dossie,
    ambiente: o.ambiente,
    origem: o.origem ?? (o.autor === 'matheus' ? 'manual' : 'agent'),
    autor: o.autor,
    iniciada_em: new Date().toISOString(),
  })
  const total = suite.cenarios.length

  const fim = (async () => {
    try {
      for (const c of cenarios) {
        if (o.sinal?.aborted) break
        if (c.erros.length) {
          o.aoPular?.(c)
          continue
        }
        const camadas = [
          { fonte: 'suite' as const, valores: suite.variaveis },
          { fonte: 'cenario' as const, valores: c.env },
        ]
        const r = await rodarCenario(o.ws, o.ambiente, camadas, c.request, c.assercoes, o.sinal)
        if (o.sinal?.aborted) break
        const auto = vereditoAuto(r.assercoes, r.erro)
        const dados = {
          rodada_id: rodadaId,
          cenario: c.id,
          titulo: c.titulo,
          ordem: suite.cenarios.indexOf(c) + 1,
          cenario_md: suite.trechos[c.id] ?? '',
          request: r.request,
          resposta: r.resposta,
          erro: r.erro,
          assercoes: r.assercoes,
          veredito: auto,
          veredito_auto: auto,
          nota: null,
          executada_em: new Date().toISOString(),
        }
        const id = repo.inserirExecucao(dados)
        o.aoExecutar?.(semMd({ id, ...dados }), c)
      }
      repo.finalizarRodada(rodadaId, o.sinal?.aborted ? 'interrompida' : 'concluida')
    } catch (e) {
      repo.finalizarRodada(rodadaId, 'interrompida')
      throw e
    } finally {
      try {
        gerarEvidencia(o.ws, o.dossie, o.ambiente)
      } catch {
        // evidência é regerada na próxima rodada
      }
    }
    const rodada = repo.rodada(rodadaId, total)!
    o.aoTerminar?.(rodada)
    return rodada
  })()
  return { rodada_id: rodadaId, fim }
}

function conferirAmbiente(ws: string, amb: string): void {
  if (!listarAmbientes(ws).includes(amb)) throw new ErroRunner(`ambiente desconhecido: ${amb}`)
}

export async function envioAvulso(o: {
  ws: string
  ambiente: string
  dossie?: string
  cenario?: string
  request: Requisicao
  env?: Record<string, string>
}): Promise<EnvioResultado> {
  conferirAmbiente(o.ws, o.ambiente)
  const camadas: Parameters<typeof resolverVariaveis>[2] = []
  let assercoes: string[] = []
  if (o.dossie) {
    const suite = lerSuite(o.ws, o.dossie)
    camadas.push({ fonte: 'suite', valores: suite.variaveis })
    if (o.cenario) {
      const c = suite.cenarios.find((x) => x.id === o.cenario)
      if (!c) throw new ErroRunner(`cenário não existe no plano: ${o.cenario}`, 404)
      camadas.push({ fonte: 'cenario', valores: c.env })
      assercoes = c.assercoes
    }
  }
  if (o.env) camadas.push({ fonte: 'extra', valores: o.env })
  const req: Requisicao = {
    method: (o.request.method || 'GET').toUpperCase(),
    url: o.request.url ?? '',
    headers: o.request.headers ?? [],
    body: o.request.body ?? '',
  }
  return rodarCenario(o.ws, o.ambiente, camadas, req, assercoes)
}

const VEREDITOS: Veredito[] = ['PASSOU', 'FALHOU', 'BLOQUEADO', 'PENDENTE']

export function mudarVeredito(ws: string, execucaoId: number, veredito: string, nota: string | null): Execucao {
  const v = veredito?.toUpperCase() as Veredito
  if (!VEREDITOS.includes(v)) throw new ErroRunner(`veredito inválido: ${veredito}. Use ${VEREDITOS.join(', ')}`)
  const repo = repositorio(ws)
  const e = repo.execucao(execucaoId)
  if (!e) throw new ErroRunner(`execução #${execucaoId} não existe`, 404)
  repo.mudarVeredito(execucaoId, v, nota?.trim() || null)
  const rodada = repo.db.prepare('select dossie, ambiente from rodadas where id = ?').get(e.rodada_id) as {
    dossie: string
    ambiente: string
  }
  gerarEvidencia(ws, rodada.dossie, rodada.ambiente)
  return semMd(repo.execucao(execucaoId)!)
}
