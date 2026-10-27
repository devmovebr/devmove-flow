import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { ConversaMc, ConversaMcDetalhe, EnvelopeMc, MensagemMc } from '../shared/tipos.ts'
import { lerCacheado } from '../runner/arquivos.ts'
import { ErroRunner } from '../runner/erros.ts'
import { pastaDossie } from '../runner/workspaces.ts'

const ARQUIVO = 'mensagens-mc.md'
const CABECALHO = /^## (\S+) · (recebida|enviada) · (\S+)\s*$/

export function parsearMensagens(texto: string): { item: string | null; mensagens: MensagemMc[] } {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n')
  const item = /^# .*· *(.+?)\s*$/.exec(linhas.find((l) => l.startsWith('# ')) ?? '')?.[1] ?? null
  const mensagens: MensagemMc[] = []
  for (let i = 0; i < linhas.length; i++) {
    const m = CABECALHO.exec(linhas[i])
    if (!m) continue
    let ini = i + 1
    while (ini < linhas.length && !linhas[ini].startsWith('```') && !CABECALHO.test(linhas[ini])) ini++
    if (ini >= linhas.length || !linhas[ini].startsWith('```')) {
      mensagens.push({ registrada_em: m[1], direcao: m[2] as MensagemMc['direcao'], tipo: m[3], envelope: null, bruto: '' })
      continue
    }
    let fim = ini + 1
    while (fim < linhas.length && !linhas[fim].startsWith('```')) fim++
    const bruto = linhas.slice(ini + 1, fim).join('\n')
    let envelope: EnvelopeMc | null = null
    try {
      const v = JSON.parse(bruto) as unknown
      if (v && typeof v === 'object' && !Array.isArray(v)) envelope = v as EnvelopeMc
    } catch {
      // bloco incompleto: a ponte pode estar no meio da escrita
    }
    mensagens.push({ registrada_em: m[1], direcao: m[2] as MensagemMc['direcao'], tipo: m[3], envelope, bruto })
    i = fim
  }
  return { item, mensagens }
}

const texto = (v: unknown) => (typeof v === 'string' ? v : '')

function aguardando(mensagens: MensagemMc[]): number {
  const respondidas = new Set(
    mensagens.filter((m) => m.tipo === 'answer.accepted').map((m) => texto(m.envelope?.payload?.questionId)),
  )
  return mensagens.filter(
    (m) => m.tipo === 'question.created' && !respondidas.has(texto(m.envelope?.payload?.questionId)),
  ).length
}

function conversa(dossie: string, md: string): ConversaMcDetalhe {
  const { item, mensagens } = parsearMensagens(md)
  const [tipo, slug] = dossie.split('/')
  const criada = mensagens.find((m) => m.tipo === 'item.created')
  return {
    dossie,
    tipo,
    slug,
    item,
    titulo: texto(criada?.envelope?.payload?.title) || slug.replace(/^\d{4}-\d{2}-\d{2}-/, ''),
    total: mensagens.length,
    aguardando: aguardando(mensagens),
    ultima_em: mensagens.at(-1)?.registrada_em ?? null,
    mensagens,
  }
}

// A ponte reescreve o arquivo a cada mensagem e o painel consulta por polling: o parse só roda quando o arquivo muda.
export function lerConversa(ws: string, dossie: string): ConversaMcDetalhe {
  const arq = join(pastaDossie(ws, dossie), ARQUIVO)
  if (!existsSync(arq)) throw new ErroRunner(`${ARQUIVO} não encontrado em doc/demandas/${dossie}`, 404)
  return lerCacheado(arq, (md) => conversa(dossie, md))
}

export function listarConversas(ws: string): ConversaMc[] {
  const base = join(ws, 'doc', 'demandas')
  const r: ConversaMc[] = []
  for (const tipo of readdirSync(base)) {
    const dirTipo = join(base, tipo)
    if (tipo.startsWith('.') || !statSync(dirTipo).isDirectory()) continue
    for (const slug of readdirSync(dirTipo)) {
      if (!existsSync(join(dirTipo, slug, ARQUIVO))) continue
      const { mensagens: _, ...resumo } = lerConversa(ws, `${tipo}/${slug}`)
      r.push(resumo)
    }
  }
  return r.sort((a, b) => (b.ultima_em ?? '').localeCompare(a.ultima_em ?? '') || a.dossie.localeCompare(b.dossie))
}
