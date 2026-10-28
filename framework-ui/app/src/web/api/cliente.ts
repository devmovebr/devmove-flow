import type { AcaoApp } from '../../shared/tipos'

export class ErroApi extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

export async function api<T>(caminho: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const resposta = await fetch(`/api${caminho}`, {
    method: init?.method ?? 'GET',
    headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const texto = await resposta.text()
  if (!resposta.ok) {
    let mensagem = texto || resposta.statusText
    try {
      const json = JSON.parse(texto) as { message?: string; erro?: string }
      mensagem = json.erro ?? json.message ?? mensagem
    } catch {
      // corpo não é JSON
    }
    throw new ErroApi(resposta.status, mensagem)
  }
  return (texto ? JSON.parse(texto) : undefined) as T
}

const cod = encodeURIComponent
const proj = (p: string) => `/projetos/${cod(p)}`
const dem = (p: string, d: string) => `${proj(p)}/demandas/${cod(d)}`

export const rotasApi = {
  info: () => '/info',
  projetos: () => '/projetos',
  ambientes: (p: string) => `${proj(p)}/ambientes`,
  comandos: (p: string, amb: string) => `${proj(p)}/ambientes/${cod(amb)}/comandos`,
  gerarValor: (p: string, amb: string, nome: string) => `${proj(p)}/ambientes/${cod(amb)}/comandos/${cod(nome)}`,
  demandas: (p: string) => `${proj(p)}/demandas`,
  demanda: dem,
  matriz: (p: string, d: string, ambiente?: string) => `${dem(p, d)}/matriz${ambiente ? `?ambiente=${cod(ambiente)}` : ''}`,
  historico: (p: string, d: string, c: string) => `${dem(p, d)}/cenarios/${cod(c)}/historico`,
  executar: (p: string, d: string) => `${dem(p, d)}/executar`,
  rodada: (p: string, id: number) => `${proj(p)}/rodadas/${id}`,
  eventos: (p: string, id: number) => `/api${proj(p)}/rodadas/${id}/eventos`,
  parar: (p: string, id: number) => `${proj(p)}/rodadas/${id}/parar`,
  execucao: (p: string, id: number) => `${proj(p)}/execucoes/${id}`,
  enviar: (p: string) => `${proj(p)}/enviar`,
  conversas: (p: string) => `${proj(p)}/mensagens`,
  conversa: (p: string, d: string) => `${proj(p)}/mensagens/${cod(d)}`,
  sessoes: (p: string) => `${proj(p)}/logs`,
  eventosSessao: (p: string, item: string) => `/api${proj(p)}/logs/${cod(item)}/eventos`,
  apps: (p: string) => `${proj(p)}/apps`,
  acaoApp: (p: string, app: string, acao: AcaoApp) => `${proj(p)}/apps/${cod(app)}/${acao}`,
  subidas: (p: string, app: string) => `${proj(p)}/apps/${cod(app)}/subidas`,
  logAnterior: (p: string, app: string) => `${proj(p)}/apps/${cod(app)}/log/anterior`,
  logApp: (p: string, app: string) => `/api${proj(p)}/apps/${cod(app)}/log`,
}
