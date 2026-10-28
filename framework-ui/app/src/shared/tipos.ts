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

// O que as listas de cenários mostram de uma execução, sem request, corpo nem asserções.
export type ExecucaoResumo = Pick<Execucao, 'id' | 'rodada_id' | 'cenario' | 'titulo' | 'ordem' | 'veredito' | 'executada_em' | 'rodada'> & {
  resposta: Pick<Resposta, 'status' | 'tempo_ms'> | null
}

// Última execução de cada cenário num ambiente, juntando rodadas parciais.
export type EstadoAtual = {
  ambiente: string
  atualizado_em: string
  placar: Placar
  execucoes: ExecucaoResumo[]
}

export type Info = { usuario: string; versao: string }

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

// Troca com o Mission Control: `<dossiê>/mensagens-mc.md`, reescrito pela ponte de agentes a cada mensagem.
export type EnvelopeMc = {
  messageId?: string
  type?: string
  scope?: unknown
  occurredAt?: string
  source?: string
  payload?: Record<string, unknown>
}

export type MensagemMc = {
  registrada_em: string
  direcao: 'recebida' | 'enviada'
  tipo: string
  envelope: EnvelopeMc | null
  bruto: string
}

export type ConversaMc = {
  dossie: string
  tipo: string
  slug: string
  item: string | null
  titulo: string
  total: number
  aguardando: number
  ultima_em: string | null
}

export type ConversaMcDetalhe = ConversaMc & { mensagens: MensagemMc[] }

// Sessão de agente conduzida pela ponte: `<workspace>/.agents-bridge/data/logs/<ITEM>.jsonl`, um evento por linha.
export type LinhaDiff = { op: '+' | '-' | ' ' | 'gap'; n: number | null; text: string }

export type EventoSessao = {
  at: string
  item: string
  kind: 'prompt' | 'text' | 'tool' | 'result' | 'agent' | 'question' | 'answer' | 'turn' | 'info' | 'error'
  agent?: string | null
  id?: string
  name?: string
  detail?: string
  text?: string
  error?: boolean
  summary?: string
  output?: string[]
  diff?: LinhaDiff[]
  status?: string
  verdict?: string
  seconds?: number
  cost?: number
}

export type SituacaoSessao = 'executando' | 'aguardando' | 'parada'

export type SessaoAgente = {
  item: string
  titulo: string | null
  dossie: string | null
  situacao: SituacaoSessao
  perguntas_abertas: number
  rodadas: number
  custo: number
  eventos: number
  atualizada_em: string
}

// Aplicações de code/ que o supervisor do host sobe: config em `tools/.local/apps.json`, estado em `.devmove/apps/`.
export type SituacaoApp = 'parada' | 'subindo' | 'no_ar' | 'falhou' | 'parando'

export type EstadoApp = {
  situacao: SituacaoApp
  pid: number | null
  iniciada_em: string | null
  finalizada_em: string | null
  codigo_saida: number | null
  erro: string | null
  autor: string | null
  subida_id: string | null
}

export type App = EstadoApp & {
  nome: string
  repo: string
  pasta: string
  comando: string
  porta: number | null
  health: string | null
}

export type RepoCodigo = { nome: string; url: string; pasta: string; clonado: boolean; apps: string[] }

export type SupervisorApps = { ligado: boolean; visto_em: string | null }

export type PainelApps = { supervisor: SupervisorApps; apps: App[]; repos_sem_app: RepoCodigo[]; erro_config: string | null }

export type AcaoApp = 'subir' | 'parar' | 'reiniciar'

export type Subida = {
  id: string
  app: string
  autor: string
  iniciada_em: string
  finalizada_em: string | null
  situacao_final: SituacaoApp | null
  codigo_saida: number | null
}
