// API simulada da Consultto para os planos de teste do demo. Estado em memória.
// POST /dev/reset volta a massa ao estado inicial.
import { createHmac } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

const PORTA = Number(process.env.PORT_MOCK ?? 4000)
const USUARIO = process.env.QA_USUARIO ?? 'qa@consultto.dev'
const SENHA = process.env.QA_SENHA ?? 'senha-qa-local'
const CHAVE = 'mock-consultto'
const PRECOS: Record<string, number> = { basico: 14900, pro: 24900 }
const DIAS_CICLO = 30

type Clinica = {
  plano: string
  ciclo_inicio: string
  vigente_desde: string | null
  ajuste: number | null
  inadimplente: boolean
  consultas: { id: string; paciente_id: string; inicio: string }[]
}

let clinicas: Record<string, Clinica> = {}

function dia(offset: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

function massa(): void {
  const hoje = dia(0)
  clinicas = {
    'qa-planos': { plano: 'basico', ciclo_inicio: dia(-10), vigente_desde: null, ajuste: null, inadimplente: false, consultas: [] },
    'qa-inadimplente': {
      plano: 'basico',
      ciclo_inicio: dia(-38),
      vigente_desde: null,
      ajuste: null,
      inadimplente: true,
      consultas: [1, 2, 3].map((n) => ({ id: `c-${n}`, paciente_id: `p-qa-${n}`, inicio: `${hoje}T${String(8 + n).padStart(2, "0")}:00:00-03:00` })),
    },
  }
}

function assinar(exp: number): string {
  return createHmac('sha256', CHAVE).update(String(exp)).digest('hex').slice(0, 32)
}

function tokenValido(auth: string | undefined): boolean {
  const m = /^Bearer mock\.(\d+)\.([0-9a-f]+)$/.exec(auth ?? '')
  return !!m && Number(m[1]) > Date.now() / 1000 && assinar(Number(m[1])) === m[2]
}

function json(res: ServerResponse, status: number, corpo: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(corpo))
}

async function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  let texto = ''
  for await (const parte of req) texto += parte
  try {
    return texto ? JSON.parse(texto) : {}
  } catch {
    return {}
  }
}

async function tratar(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://localhost:${PORTA}`)
  const rota = `${req.method} ${url.pathname}`

  if (rota === 'POST /auth/token') {
    const b = await lerCorpo(req)
    if (b.usuario !== USUARIO || b.senha !== SENHA) return json(res, 401, { codigo: 'CREDENCIAIS_INVALIDAS' })
    const expiresIn = 3600
    const exp = Math.floor(Date.now() / 1000) + expiresIn
    return json(res, 200, { access_token: `mock.${exp}.${assinar(exp)}`, expires_in: expiresIn })
  }
  if (rota === 'POST /dev/reset') {
    massa()
    return json(res, 200, { ok: true })
  }
  if (!tokenValido(req.headers.authorization)) return json(res, 401, { codigo: 'NAO_AUTENTICADO' })

  const id = String(req.headers['x-clinica'] ?? '')
  const c = clinicas[id]
  if (!c) return json(res, 404, { codigo: 'CLINICA_NAO_ENCONTRADA' })
  const situacao = c.inadimplente ? 'leitura' : 'ativa'

  if (rota === 'GET /v1/assinatura') {
    return json(res, 200, { plano: c.plano, situacao, ciclo_inicio: c.ciclo_inicio, vigente_desde: c.vigente_desde })
  }
  if (rota === 'POST /v1/assinatura/troca') {
    const b = await lerCorpo(req)
    const plano = String(b.plano ?? '')
    if (!(plano in PRECOS)) return json(res, 422, { codigo: 'PLANO_INVALIDO', mensagem: `plano desconhecido: ${plano}` })
    if (c.inadimplente) return json(res, 403, { codigo: 'MODO_LEITURA' })
    if (plano !== c.plano) {
      const decorridos = Math.round((Date.parse(dia(0)) - Date.parse(c.ciclo_inicio)) / 86_400_000)
      const restantes = DIAS_CICLO - decorridos
      // Defeito conhecido (T3): arredonda para cima em vez de para baixo.
      c.ajuste = Math.ceil(((PRECOS[plano] - PRECOS[c.plano]) * restantes) / DIAS_CICLO)
      c.plano = plano
      c.vigente_desde = new Date().toISOString()
    }
    return json(res, 200, { plano: c.plano, situacao, vigente_desde: c.vigente_desde })
  }
  if (rota === 'GET /v1/faturas/proxima') {
    const itens: { tipo: string; valor: number }[] = [{ tipo: 'mensalidade', valor: PRECOS[c.plano] }]
    if (c.ajuste !== null) itens.push({ tipo: 'ajuste_troca', valor: c.ajuste })
    return json(res, 200, { vencimento: dia(DIAS_CICLO - 10), itens, total: itens.reduce((s, i) => s + i.valor, 0) })
  }
  if (rota === 'POST /v1/consultas') {
    if (c.inadimplente) return json(res, 403, { codigo: 'MODO_LEITURA', mensagem: 'clínica com fatura vencida além da tolerância' })
    const b = await lerCorpo(req)
    const nova = { id: `c-${c.consultas.length + 1}`, paciente_id: String(b.paciente_id ?? ''), inicio: String(b.inicio ?? '') }
    c.consultas.push(nova)
    return json(res, 201, nova)
  }
  if (rota === 'GET /v1/consultas') return json(res, 200, c.consultas)

  json(res, 404, { codigo: 'ROTA_NAO_ENCONTRADA', rota })
}

massa()
createServer((req, res) => {
  tratar(req, res).catch((e) => json(res, 500, { codigo: 'ERRO', mensagem: String(e) }))
}).listen(PORTA, () => console.log(`mock Consultto em http://localhost:${PORTA}`))
