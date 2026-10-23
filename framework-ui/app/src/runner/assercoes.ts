import { JSONPath } from 'jsonpath-plus'
import type { Assercao, Resposta, Veredito } from '../shared/tipos.ts'

type Operador = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'contém'

export type AssercaoLida =
  | { tipo: 'status'; esperado: number }
  | { tipo: 'comparacao'; caminho: string; op: Operador; valor: unknown }
  | { tipo: 'presenca'; caminho: string; existe: boolean }
  | { tipo: 'manual' }
  | { tipo: 'erro'; erro: string }

export function parsearAssercao(texto: string): AssercaoLida {
  const st = /^status\s+(\d{3})$/i.exec(texto)
  if (st) return { tipo: 'status', esperado: Number(st[1]) }
  if (!texto.startsWith('`')) return { tipo: 'manual' }
  const pres = /^`([^`]+)`\s+(existe|ausente)$/.exec(texto)
  if (pres) return { tipo: 'presenca', caminho: pres[1], existe: pres[2] === 'existe' }
  const cmp = /^`([^`]+)`\s+(==|!=|>=|<=|>|<|contém)\s+(.+)$/.exec(texto)
  if (!cmp) {
    if (/^`\$/.test(texto)) return { tipo: 'erro', erro: 'esperado `<jsonpath>` <op> <valor JSON>' }
    return { tipo: 'manual' }
  }
  try {
    return { tipo: 'comparacao', caminho: cmp[1], op: cmp[2] as Operador, valor: JSON.parse(cmp[3]) }
  } catch {
    return { tipo: 'erro', erro: `valor não é JSON: ${cmp[3]}` }
  }
}

export function consultar(json: unknown, caminho: string): unknown {
  if (json === undefined || json === null || typeof json !== 'object') return undefined
  let r: unknown[]
  try {
    r = JSONPath({ path: caminho, json: json as object, wrap: true }) as unknown[]
  } catch {
    return undefined
  }
  if (!r.length) return undefined
  return r.length === 1 ? r[0] : r
}

function igual(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b)
}

function comparar(obtido: unknown, op: Operador, valor: unknown): boolean {
  switch (op) {
    case '==':
      return igual(obtido, valor)
    case '!=':
      return !igual(obtido, valor)
    case 'contém':
      if (typeof obtido === 'string') return typeof valor === 'string' && obtido.includes(valor)
      if (Array.isArray(obtido)) return obtido.some((x) => igual(x, valor))
      return false
    default: {
      if (typeof obtido !== 'number' || typeof valor !== 'number') return false
      if (op === '>') return obtido > valor
      if (op === '>=') return obtido >= valor
      if (op === '<') return obtido < valor
      return obtido <= valor
    }
  }
}

export function avaliar(textos: string[], resposta: Resposta | null): Assercao[] {
  let json: unknown
  if (resposta) {
    try {
      json = JSON.parse(resposta.body)
    } catch {
      json = undefined
    }
  }
  return textos.map((texto): Assercao => {
    const a = parsearAssercao(texto)
    if (a.tipo === 'manual') return { texto, tipo: 'manual', ok: null }
    if (a.tipo === 'erro') return { texto, tipo: 'auto', ok: false, obtido: a.erro }
    if (!resposta) return { texto, tipo: 'auto', ok: null }
    if (a.tipo === 'status') return { texto, tipo: 'auto', ok: resposta.status === a.esperado, obtido: resposta.status }
    const obtido = consultar(json, a.caminho)
    const ok = a.tipo === 'presenca' ? (obtido !== undefined) === a.existe : comparar(obtido, a.op, a.valor)
    return { texto, tipo: 'auto', ok, obtido }
  })
}

export function vereditoAuto(assercoes: Assercao[], erro: string | null): Veredito {
  if (erro) return 'FALHOU'
  if (assercoes.some((a) => a.tipo === 'auto' && a.ok === false)) return 'FALHOU'
  if (assercoes.some((a) => a.tipo === 'manual')) return 'PENDENTE'
  return 'PASSOU'
}
