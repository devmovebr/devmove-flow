// Contrato entre runner, API e front. Fonte: framework-ui/SPEC.md.

export type Veredito = 'PASSOU' | 'FALHOU' | 'BLOQUEADO' | 'PENDENTE'

export type Placar = {
  passou: number
  falhou: number
  bloqueado: number
  pendente: number
  nao_executado: number
  total: number
}

export type Rodada = {
  id: number
  dossie: string
  ambiente: string
  origem: 'agent' | 'manual'
  autor: string
  status: 'executando' | 'concluida' | 'interrompida'
  iniciada_em: string
  finalizada_em: string | null
  placar: Placar
}

export type Requisicao = {
  method: string
  url: string
  headers: [string, string][]
  body: string
}

export type Resposta = {
  status: number
  headers: [string, string][]
  body: string
  tempo_ms: number
  tamanho: number
}

export type Cenario = {
  id: string
  titulo: string
  precondicao?: string
  objetivo?: string
  env: Record<string, string>
  request: Requisicao & { raw: string }
  assercoes: string[]
  erros: string[]
}

export type Assercao = {
  texto: string
  tipo: 'auto' | 'manual'
  ok: boolean | null
  obtido?: unknown
}

export type Execucao = {
  id: number
  rodada_id: number
  cenario: string
  titulo: string
  ordem: number
  request: Requisicao
  resposta: Resposta | null
  erro: string | null
  assercoes: Assercao[]
  veredito: Veredito
  veredito_auto: Veredito
  nota: string | null
  executada_em: string
  rodada?: Rodada
}

// Última execução de cada cenário num ambiente, juntando rodadas parciais.
export type EstadoAtual = {
  ambiente: string
  atualizado_em: string
  placar: Placar
  execucoes: Execucao[]
}

export type Projeto = { nome: string; caminho: string }

export type Demanda = {
  dossie: string
  tipo: string
  slug: string
  titulo: string
  data: string
  servicos: string
  status: string
  origem: string | null
  total_cenarios: number
  ultima_rodada: Rodada | null
  estado_atual: Omit<EstadoAtual, 'execucoes'> | null
}

export type Suite = {
  titulo: string
  mudanca: string
  variaveis: Record<string, string>
  cenarios: Cenario[]
}

export type DemandaDetalhe = { demanda: Demanda; suite: Suite; rodadas: Rodada[]; estados: EstadoAtual[] }

export type Matriz = {
  rodadas: Rodada[]
  linhas: { cenario: string; titulo: string; vereditos: Record<number, Veredito> }[]
}

export type EnvioResultado = {
  request: Requisicao
  resposta: Resposta | null
  erro: string | null
  assercoes: Assercao[]
}
