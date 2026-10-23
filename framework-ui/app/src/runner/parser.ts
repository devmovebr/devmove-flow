import type { Cenario, Requisicao, Suite } from '../shared/tipos.ts'
import { parsearAssercao } from './assercoes.ts'
import { lerEnv } from './variaveis.ts'

export type SuiteLida = Suite & { trechos: Record<string, string> }

const CABECALHO_CENARIO = /^###\s+(T\d+)\s+(.+?)\s*$/

export function parsearPlano(md: string): SuiteLida {
  const linhas = md.replace(/\r\n/g, '\n').split('\n')
  let titulo = ''
  let secao = ''
  const textoSecao: Record<string, string[]> = {}
  let variaveis: Record<string, string> = {}
  const blocos: { inicio: number; fim: number }[] = []
  let cercaAberta = false
  let blocoVariaveis: string[] | null = null

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    if (linha.startsWith('```')) {
      cercaAberta = !cercaAberta
      if (secao === 'variáveis' && !cercaAberta && blocoVariaveis) {
        variaveis = { ...variaveis, ...lerEnv(blocoVariaveis.join('\n')) }
        blocoVariaveis = null
      } else if (secao === 'variáveis' && cercaAberta && linha.trim() === '```env') {
        blocoVariaveis = []
        continue
      }
      if (secao !== 'cenários') (textoSecao[secao] ??= []).push(linha)
      continue
    }
    if (cercaAberta) {
      if (blocoVariaveis) blocoVariaveis.push(linha)
      else if (secao !== 'cenários') (textoSecao[secao] ??= []).push(linha)
      continue
    }
    const h1 = /^#\s+(.+)$/.exec(linha)
    if (h1 && !titulo) {
      titulo = h1[1].replace(/^Plano de teste:\s*/i, '').trim()
      continue
    }
    const h2 = /^##\s+(.+)$/.exec(linha)
    if (h2) {
      if (secao === 'cenários' && blocos.length) blocos[blocos.length - 1].fim = i
      secao = h2[1].trim().toLowerCase()
      continue
    }
    if (secao === 'cenários') {
      if (linha.startsWith('### ')) {
        if (blocos.length) blocos[blocos.length - 1].fim = i
        blocos.push({ inicio: i, fim: linhas.length })
      }
      continue
    }
    ;(textoSecao[secao] ??= []).push(linha)
  }

  const cenarios: Cenario[] = []
  const trechos: Record<string, string> = {}
  for (const b of blocos) {
    const trecho = linhas.slice(b.inicio, b.fim).join('\n').trimEnd()
    const cenario = parsearCenario(trecho)
    if (cenarios.some((c) => c.id === cenario.id)) cenario.erros.push(`id repetido: ${cenario.id}`)
    cenarios.push(cenario)
    trechos[cenario.id] = trecho
  }

  return {
    titulo,
    mudanca: (textoSecao['mudança'] ?? []).join('\n').trim(),
    variaveis,
    cenarios,
    trechos,
  }
}

export function parsearCenario(trecho: string): Cenario {
  const linhas = trecho.split('\n')
  const erros: string[] = []
  const cab = CABECALHO_CENARIO.exec(linhas[0] ?? '')
  const cenario: Cenario = {
    id: cab ? cab[1] : (linhas[0] ?? '').replace(/^#+\s*/, '').split(/\s+/)[0] || '?',
    titulo: cab ? cab[2] : (linhas[0] ?? '').replace(/^#+\s*/, ''),
    env: {},
    request: { raw: '', method: '', url: '', headers: [], body: '' },
    assercoes: [],
    erros,
  }
  if (!cab) erros.push('cabeçalho deve ser "### T<n> <título>"')

  let blocosHttp = 0
  let temEspera = false
  let naEspera = false
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i]
    if (linha.startsWith('```')) {
      const lang = linha.slice(3).trim()
      const corpo: string[] = []
      i++
      while (i < linhas.length && !linhas[i].startsWith('```')) corpo.push(linhas[i++])
      if (i >= linhas.length) erros.push(`bloco ${lang || 'sem linguagem'} sem fechamento`)
      if (lang === 'env') cenario.env = { ...cenario.env, ...lerEnv(corpo.join('\n')) }
      else if (lang === 'http') {
        blocosHttp++
        const raw = corpo.join('\n')
        const req = parsearHttp(raw)
        if ('erro' in req) erros.push(req.erro)
        else cenario.request = { ...req, raw }
      }
      naEspera = false
      continue
    }
    const pre = /^Pré-condição:\s*(.*)$/i.exec(linha)
    if (pre) {
      cenario.precondicao = pre[1].trim()
      naEspera = false
      continue
    }
    const obj = /^Objetivo:\s*(.*)$/i.exec(linha)
    if (obj) {
      cenario.objetivo = obj[1].trim()
      naEspera = false
      continue
    }
    if (/^Espera:\s*$/i.test(linha)) {
      temEspera = true
      naEspera = true
      continue
    }
    if (naEspera) {
      const item = /^\s*[-*]\s+(.+)$/.exec(linha)
      if (item) {
        const texto = item[1].trim()
        const p = parsearAssercao(texto)
        if (p.tipo === 'erro') erros.push(`asserção "${texto}": ${p.erro}`)
        cenario.assercoes.push(texto)
      } else if (linha.trim()) naEspera = false
    }
  }
  if (blocosHttp === 0) erros.push('sem bloco ```http')
  if (blocosHttp > 1) erros.push('mais de um bloco ```http')
  if (!temEspera) erros.push('sem "Espera:"')
  else if (!cenario.assercoes.length) erros.push('"Espera:" sem itens')
  return cenario
}

export function parsearHttp(raw: string): Requisicao | { erro: string } {
  const linhas = raw.split('\n')
  let i = 0
  while (i < linhas.length && !linhas[i].trim()) i++
  const primeira = /^([A-Z]+)\s+(\S+)(?:\s+HTTP\/[\d.]+)?\s*$/.exec(linhas[i] ?? '')
  if (!primeira) return { erro: 'primeira linha do http deve ser "MÉTODO URL"' }
  i++
  const headers: [string, string][] = []
  for (; i < linhas.length && linhas[i].trim(); i++) {
    const h = /^([^:\s]+):\s*(.*)$/.exec(linhas[i])
    if (!h) return { erro: `cabeçalho inválido: ${linhas[i]}` }
    headers.push([h[1], h[2]])
  }
  const body = linhas.slice(i + 1).join('\n').trim()
  return { method: primeira[1], url: primeira[2], headers, body }
}
