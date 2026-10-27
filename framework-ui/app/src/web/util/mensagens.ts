import type { MensagemMc } from '../../shared/tipos'

export type Origem = 'pendencia' | 'gate' | 'permissao' | 'rodada' | 'outra'

export type Visao = {
  rotulo: string
  titulo: string
  corpo: string | null
  contexto: { texto: string; json: boolean } | null
  opcoes: string[]
  meta: string[]
  questionId: string | null
  origem: Origem | null
}

const texto = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))

const tiposItem: Record<string, string> = { story: 'história', bug: 'bug', task: 'tarefa', epic: 'épico', spike: 'spike' }

// O questionId diz quem perguntou: <ITEM>:P3 pendência, :ask: gate do terminal, :perm: permissão, :turn:<n> fim de rodada.
export function origemPergunta(questionId: string): { origem: Origem; rotulo: string } {
  const pendencia = /:(P\d+)$/.exec(questionId)
  if (pendencia) return { origem: 'pendencia', rotulo: `Pendência ${pendencia[1]}` }
  if (questionId.includes(':ask:')) return { origem: 'gate', rotulo: 'Gate do orquestrador' }
  if (questionId.includes(':perm:')) return { origem: 'permissao', rotulo: 'Pedido de permissão' }
  const rodada = /:turn:(\d+)/.exec(questionId)
  if (rodada) return { origem: 'rodada', rotulo: `Fim da rodada ${rodada[1]}` }
  return { origem: 'outra', rotulo: 'Pergunta' }
}

function contexto(v: unknown): Visao['contexto'] {
  const t = texto(v).trim()
  if (!t) return null
  try {
    const json = JSON.parse(t) as unknown
    if (json && typeof json === 'object') return { texto: t, json: true }
  } catch {
    // contexto em texto livre
  }
  return { texto: t, json: false }
}

export function humanizar(m: MensagemMc): Visao {
  const p = m.envelope?.payload ?? {}
  const base: Visao = { rotulo: m.tipo, titulo: m.tipo, corpo: null, contexto: null, opcoes: [], meta: [], questionId: null, origem: null }
  switch (m.tipo) {
    case 'item.created':
      return {
        ...base,
        rotulo: 'Demanda criada no MC',
        titulo: texto(p.title) || 'Demanda sem título',
        corpo: texto(p.description) || null,
        meta: [texto(p.reference), tiposItem[texto(p.type)] ?? texto(p.type), texto(p.agentProvider) && `agente ${texto(p.agentProvider)}`].filter(Boolean),
      }
    case 'question.created': {
      const questionId = texto(p.questionId)
      const { origem, rotulo } = origemPergunta(questionId)
      const ctx = contexto(p.context)
      return {
        ...base,
        rotulo,
        titulo: origem === 'gate' && ctx && !ctx.json ? ctx.texto : rotulo,
        corpo: texto(p.question) || null,
        contexto: origem === 'rodada' || (origem === 'gate' && ctx && !ctx.json) ? null : ctx,
        opcoes: Array.isArray(p.options) ? p.options.map(texto) : [],
        questionId,
        origem,
      }
    }
    case 'answer.accepted':
      return {
        ...base,
        rotulo: 'Resposta aprovada no MC',
        titulo: 'Resposta',
        corpo: texto(p.answer) || null,
        meta: texto(p.verdict) ? [texto(p.verdict)] : [],
        questionId: texto(p.questionId),
      }
    default:
      return base
  }
}

export function direcao(m: MensagemMc): string {
  return m.direcao === 'recebida' ? 'MC → harness' : 'harness → MC'
}

export function trecho(md: string | null, max = 90): string {
  const t = (md ?? '').replace(/[#*_`>|-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}
