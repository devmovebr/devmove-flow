import { existsSync, mkdirSync } from 'node:fs'
import { isAbsolute, join, normalize } from 'node:path'
import { lerCacheado } from '../arquivos.ts'
import { ErroRunner } from '../erros.ts'

export type ConfigApp = {
  nome: string
  repo: string
  pasta: string
  comando: string
  env: Record<string, string>
  antes: string[]
  porta: number | null
  health: string | null
}

export const NOME_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export const arquivoConfig = (ws: string) => join(ws, 'tools', '.local', 'apps.json')

const raizApps = (ws: string) => join(ws, '.devmove', 'apps')

export const pastas = (ws: string) => ({
  raiz: raizApps(ws),
  estado: join(raizApps(ws), 'estado'),
  pedidos: join(raizApps(ws), 'pedidos'),
  logs: join(raizApps(ws), 'logs'),
})

export function garantirPastas(ws: string): void {
  for (const p of Object.values(pastas(ws))) mkdirSync(p, { recursive: true })
}

export const arquivoEstado = (ws: string, app: string) => join(pastas(ws).estado, `${app}.json`)
// O wrapper grava o código de saída aqui quando a app termina sozinha; parada por kill não grava.
export const arquivoSaida = (ws: string, app: string) => join(pastas(ws).estado, `${app}.saida`)
export const arquivoLog = (ws: string, app: string, anterior = false) => join(pastas(ws).logs, `${app}${anterior ? '.anterior' : ''}.log`)
export const arquivoBatimento = (ws: string) => join(raizApps(ws), 'supervisor.json')
export const arquivoLogSupervisor = (ws: string) => join(raizApps(ws), 'supervisor.log')

function texto(v: unknown, campo: string, app: string): string {
  if (typeof v !== 'string' || !v.trim()) throw new ErroRunner(`apps.json: ${app}.${campo} precisa ser texto`)
  return v
}

function pastaInterna(pasta: string, app: string): string {
  const n = normalize(pasta).replace(/\\/g, '/')
  if (isAbsolute(pasta) || n.startsWith('..')) throw new ErroRunner(`apps.json: ${app}.pasta precisa ficar dentro do workspace`)
  return n
}

function parsearConfig(conteudo: string): ConfigApp[] {
  let bruto: unknown
  try {
    bruto = JSON.parse(conteudo)
  } catch (e) {
    throw new ErroRunner(`apps.json inválido: ${(e as Error).message}`)
  }
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) throw new ErroRunner('apps.json precisa ser um objeto { "<app>": {...} }')
  return Object.entries(bruto as Record<string, Record<string, unknown>>)
    .filter(([nome]) => !nome.startsWith('$'))
    .map(([nome, c]): ConfigApp => {
      if (!NOME_VALIDO.test(nome)) throw new ErroRunner(`apps.json: nome de app inválido: ${nome}`)
      if (!c || typeof c !== 'object') throw new ErroRunner(`apps.json: ${nome} precisa ser um objeto`)
      const repo = c.repo === undefined ? nome : texto(c.repo, 'repo', nome)
      const env = c.env ?? {}
      if (typeof env !== 'object' || Array.isArray(env) || Object.values(env).some((v) => typeof v !== 'string'))
        throw new ErroRunner(`apps.json: ${nome}.env precisa ser { "VAR": "valor" }`)
      const antes = c.antes ?? []
      if (!Array.isArray(antes) || antes.some((a) => typeof a !== 'string')) throw new ErroRunner(`apps.json: ${nome}.antes precisa ser lista de comandos`)
      const porta = c.porta ?? null
      if (porta !== null && (!Number.isInteger(porta) || (porta as number) <= 0)) throw new ErroRunner(`apps.json: ${nome}.porta precisa ser número`)
      return {
        nome,
        repo,
        pasta: pastaInterna(c.pasta === undefined ? `code/${repo}` : texto(c.pasta, 'pasta', nome), nome),
        comando: texto(c.comando, 'comando', nome),
        env: env as Record<string, string>,
        antes: antes as string[],
        porta: porta as number | null,
        health: c.health === undefined || c.health === null ? null : texto(c.health, 'health', nome),
      }
    })
}

export function lerConfig(ws: string): ConfigApp[] {
  const arq = arquivoConfig(ws)
  return existsSync(arq) ? lerCacheado(arq, parsearConfig) : []
}

export function configDe(ws: string, app: string): ConfigApp {
  const c = lerConfig(ws).find((x) => x.nome === app)
  if (!c) throw new ErroRunner(`app não configurada em tools/.local/apps.json: ${app}`, 404)
  return c
}
