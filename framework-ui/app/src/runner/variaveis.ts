import { execFile } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Requisicao } from '../shared/tipos.ts'

export type Fonte = 'ambiente' | 'local' | 'cmd' | 'suite' | 'cenario' | 'extra'

export type Variaveis = {
  valores: Record<string, string>
  segredos: Set<string>
  fontes: Record<string, Fonte>
  comandos: Record<string, string>
}

const NOME_VAR = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g
const CACHE_MS = 5 * 60 * 1000
const cacheCmd = new Map<string, { valor: string; expira: number }>()

export function lerEnv(texto: string): Record<string, string> {
  const r: Record<string, string> = {}
  for (const bruta of texto.split('\n')) {
    const linha = bruta.trim()
    if (!linha || linha.startsWith('#')) continue
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(linha)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    r[m[1]] = v
  }
  return r
}

function lerArquivoEnv(caminho: string): Record<string, string> {
  return existsSync(caminho) ? lerEnv(readFileSync(caminho, 'utf8')) : {}
}

export function listarAmbientes(ws: string): string[] {
  const dir = join(ws, 'tools', 'ambientes')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.env'))
    .map((f) => f.slice(0, -4))
    .sort()
}

export function arquivoLocal(ws: string, amb: string): string {
  return join(ws, 'tools', '.local', 'ambientes', `${amb}.env`)
}

function rodarComando(ws: string, cmd: string, renovar = false): Promise<string> {
  const chave = `${ws}\0${cmd}`
  const c = cacheCmd.get(chave)
  if (!renovar && c && c.expira > Date.now()) return Promise.resolve(c.valor)
  return new Promise((resolve, reject) => {
    execFile('bash', ['-c', cmd], { cwd: ws, timeout: 30_000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`comando "${cmd}" falhou: ${(stderr || err.message).trim()}`))
      const valor = stdout.trim()
      cacheCmd.set(chave, { valor, expira: Date.now() + CACHE_MS })
      resolve(valor)
    })
  })
}

export async function resolverVariaveis(
  ws: string,
  amb: string,
  camadas: { fonte: Fonte; valores: Record<string, string> }[] = [],
): Promise<Variaveis> {
  const arqAmb = join(ws, 'tools', 'ambientes', `${amb}.env`)
  if (!existsSync(arqAmb)) throw new Error(`ambiente desconhecido: ${amb}`)
  const todas: { fonte: Fonte; valores: Record<string, string> }[] = [
    { fonte: 'ambiente', valores: lerArquivoEnv(arqAmb) },
    { fonte: 'local', valores: lerArquivoEnv(arquivoLocal(ws, amb)) },
    ...camadas,
  ]
  const v: Variaveis = { valores: {}, segredos: new Set(), fontes: {}, comandos: {} }
  for (const camada of todas) {
    for (const [chave, valor] of Object.entries(camada.valores)) {
      if (chave.endsWith('_CMD')) {
        const nome = chave.slice(0, -4)
        v.comandos[nome] = valor
        v.fontes[nome] = 'cmd'
        delete v.valores[nome]
      } else {
        v.valores[chave] = valor
        v.fontes[chave] = camada.fonte
        delete v.comandos[chave]
      }
    }
  }
  for (const [nome, cmd] of Object.entries(v.comandos)) v.valores[nome] = await rodarComando(ws, cmd)
  for (const [nome, fonte] of Object.entries(v.fontes)) if (fonte === 'local' || fonte === 'cmd') v.segredos.add(nome)
  return v
}

// Variáveis `<NOME>_CMD` do ambiente, sem executar, com a mesma precedência do resolverVariaveis.
export function comandosDoAmbiente(ws: string, amb: string): { nome: string; comando: string }[] {
  const arqAmb = join(ws, 'tools', 'ambientes', `${amb}.env`)
  if (!existsSync(arqAmb)) throw new Error(`ambiente desconhecido: ${amb}`)
  const comandos = new Map<string, string>()
  for (const valores of [lerArquivoEnv(arqAmb), lerArquivoEnv(arquivoLocal(ws, amb))]) {
    for (const [chave, valor] of Object.entries(valores)) {
      if (chave.endsWith('_CMD')) comandos.set(chave.slice(0, -4), valor)
      else comandos.delete(chave)
    }
  }
  return [...comandos].map(([nome, comando]) => ({ nome, comando }))
}

// Valor avulso pedido na UI (Gerar token). `renovar` ignora o cache de 5 minutos.
export async function gerarValor(ws: string, amb: string, nome: string, renovar: boolean): Promise<string> {
  const c = comandosDoAmbiente(ws, amb).find((x) => x.nome === nome)
  if (!c) throw new Error(`${nome}_CMD não existe no ambiente ${amb}`)
  return rodarComando(ws, c.comando, renovar)
}

export function nomesUsados(texto: string): string[] {
  return [...new Set([...texto.matchAll(NOME_VAR)].map((m) => m[1]))]
}

// Com `gravar`, segredos ficam como {{NOME}}.
export function substituir(texto: string, v: Variaveis, gravar = false): { texto: string; faltando: string[] } {
  const faltando: string[] = []
  const r = texto.replace(NOME_VAR, (todo, nome: string) => {
    if (!(nome in v.valores)) {
      faltando.push(nome)
      return todo
    }
    return gravar && v.segredos.has(nome) ? `{{${nome}}}` : v.valores[nome]
  })
  return { texto: r, faltando }
}

export function resolverRequisicao(req: Requisicao, v: Variaveis, gravar = false): { req: Requisicao; faltando: string[] } {
  const faltando = new Set<string>()
  const s = (t: string) => {
    const r = substituir(t, v, gravar)
    r.faltando.forEach((f) => faltando.add(f))
    return r.texto
  }
  return {
    req: {
      method: req.method,
      url: s(req.url),
      headers: req.headers.map(([k, val]) => [k, s(val)] as [string, string]),
      body: s(req.body),
    },
    faltando: [...faltando],
  }
}

export function mascarar(texto: string, v: Variaveis): string {
  let r = texto
  for (const nome of v.segredos) {
    const valor = v.valores[nome]
    if (valor && valor.length >= 4) r = r.split(valor).join(`{{${nome}}}`)
  }
  return r
}
