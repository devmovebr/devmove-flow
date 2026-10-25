import {
  Braces,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  CornerDownRight,
  FilePlus2,
  Flag,
  Hourglass,
  MessageSquareText,
  ShieldQuestionMark,
  type LucideIcon,
} from 'lucide-react'
import { createElement, useState } from 'react'
import type { MensagemMc } from '../../../shared/tipos'
import { Markdown } from '../../ui/Markdown'
import { direcao, hora, trecho, type Origem, type Visao } from '../../util/mensagens'
import { JsonArvore } from '../cenario/JsonArvore'

export type Vinculo = { indice: number; mensagem: MensagemMc; visao: Visao }

const icones: Record<Origem, LucideIcon> = {
  pendencia: CircleDashed,
  gate: MessageSquareText,
  permissao: ShieldQuestionMark,
  rodada: Flag,
  outra: MessageSquareText,
}

function icone(m: MensagemMc, v: Visao): LucideIcon {
  if (m.tipo === 'item.created') return FilePlus2
  if (m.tipo === 'answer.accepted') return CornerDownRight
  if (v.origem) return icones[v.origem]
  return Braces
}

const LONGO = 700

function Corpo({ texto }: { texto: string }) {
  const longo = texto.length > LONGO || texto.split('\n').length > 14
  const [aberto, setAberto] = useState(!longo)
  return (
    <div className="px-4 pt-2">
      <div className={`relative ${aberto ? '' : 'max-h-[200px] overflow-hidden'}`}>
        <Markdown texto={texto} />
        {!aberto && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-superficie" />}
      </div>
      {longo && (
        <button type="button" onClick={() => setAberto(!aberto)} className="mt-1 cursor-pointer text-[11px] text-acento-forte hover:underline">
          {aberto ? 'Recolher' : 'Mostrar tudo'}
        </button>
      )}
    </div>
  )
}

function Referencia({ rotulo, alvo, aoIr }: { rotulo: string; alvo: Vinculo; aoIr: (indice: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => aoIr(alvo.indice)}
      className="mx-4 mt-3 flex w-[calc(100%-2rem)] cursor-pointer items-start gap-2 rounded-md border border-borda bg-painel px-3 py-2 text-left hover:border-borda-forte"
    >
      <CornerDownRight size={12} className="mt-0.5 shrink-0 text-texto-3" />
      <span className="min-w-0 text-[11px] leading-relaxed">
        <span className="text-texto-3">
          {rotulo} · {alvo.visao.rotulo} · {hora(alvo.mensagem.registrada_em)}
        </span>
        <span className="block truncate text-texto-2">{trecho(alvo.visao.corpo) || alvo.visao.titulo}</span>
      </span>
    </button>
  )
}

export function CartaoMensagem({
  mensagem,
  visao,
  indice,
  ultimo,
  pergunta,
  resposta,
  destacado,
  aoIr,
}: {
  mensagem: MensagemMc
  visao: Visao
  indice: number
  ultimo: boolean
  pergunta: Vinculo | null
  resposta: Vinculo | null
  destacado: boolean
  aoIr: (indice: number) => void
}) {
  const conhecido = visao.corpo !== null || visao.contexto !== null || mensagem.tipo === 'item.created'
  const [jsonAberto, setJsonAberto] = useState(!conhecido)
  const recebida = mensagem.direcao === 'recebida'
  const ehPergunta = mensagem.tipo === 'question.created'
  const escolhida = resposta?.visao.corpo?.trim()

  return (
    <li id={`msg-${indice}`} className="relative grid scroll-mt-4 grid-cols-[28px_minmax(0,1fr)] gap-3 pb-4">
      {!ultimo && <span className="absolute top-8 bottom-0 left-[13.5px] w-px bg-borda" />}
      <span
        className={`relative mt-2 flex size-7 items-center justify-center rounded-full border ${
          recebida ? 'border-info/40 bg-info/10 text-info' : 'border-acento/40 bg-acento-suave text-acento-forte'
        }`}
      >
        {createElement(icone(mensagem, visao), { size: 13 })}
      </span>

      <article
        className={`min-w-0 rounded-lg border bg-superficie pb-3 transition-shadow duration-700 ${
          destacado ? 'border-acento shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-acento)_25%,transparent)]' : 'border-borda'
        }`}
      >
        <header className="flex items-center gap-2 px-4 pt-3 text-[11px]">
          <span
            className={`rounded px-1.5 py-px font-medium whitespace-nowrap ${recebida ? 'bg-info/12 text-info' : 'bg-acento-suave text-acento-forte'}`}
          >
            {direcao(mensagem)}
          </span>
          <span className="truncate text-texto-2">{visao.rotulo}</span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {ehPergunta &&
              (resposta ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-passou/12 px-2 py-0.5 text-[10px] font-medium text-passou">
                  <CheckCheck size={11} />
                  respondida
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-pendente/15 px-2 py-0.5 text-[10px] font-medium text-pendente">
                  <Hourglass size={10} />
                  aguardando resposta no MC
                </span>
              ))}
            <time dateTime={mensagem.registrada_em} title={mensagem.registrada_em} className="text-texto-3 tabular-nums">
              {hora(mensagem.registrada_em)}
            </time>
          </span>
        </header>

        {visao.titulo !== visao.rotulo && <h3 className="px-4 pt-1.5 text-[13px] font-medium">{visao.titulo}</h3>}

        {visao.meta.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-2">
            {visao.meta.map((m) => (
              <span key={m} className="rounded-md border border-borda-forte px-1.5 py-px text-[10px] text-texto-2">
                {m}
              </span>
            ))}
          </div>
        )}

        {visao.corpo && <Corpo texto={visao.corpo} />}

        {visao.contexto && (
          <div className="mx-4 mt-3 rounded-md border border-borda bg-painel px-3 py-2">
            <div className="mb-1 text-[10px] font-medium tracking-[0.06em] text-texto-3 uppercase">
              {visao.origem === 'permissao' ? 'Entrada da ferramenta' : 'Contexto'}
            </div>
            {visao.contexto.json ? <JsonArvore texto={visao.contexto.texto} /> : <Markdown texto={visao.contexto.texto} className="text-texto-2" />}
          </div>
        )}

        {visao.opcoes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {visao.opcoes.map((o) => (
              <span
                key={o}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                  escolhida === o.trim() ? 'border-acento bg-acento-suave text-acento-forte' : 'border-borda-forte text-texto-2'
                }`}
              >
                {o}
              </span>
            ))}
          </div>
        )}

        {pergunta && <Referencia rotulo="Em resposta a" alvo={pergunta} aoIr={aoIr} />}
        {resposta && <Referencia rotulo="Respondida" alvo={resposta} aoIr={aoIr} />}

        <div className="mx-4 mt-3 border-t border-borda pt-2">
          <button
            type="button"
            onClick={() => setJsonAberto(!jsonAberto)}
            className="flex cursor-pointer items-center gap-1 text-[11px] text-texto-3 hover:text-texto"
          >
            {jsonAberto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Envelope JSON
            <span className="ml-1 font-mono text-[10px]">
              {[mensagem.tipo, mensagem.envelope?.source, mensagem.envelope?.messageId].filter(Boolean).join(' · ')}
            </span>
          </button>
          {jsonAberto && (
            <div className="mt-2 max-h-[420px] overflow-auto rounded-md bg-fundo px-2 py-2">
              <JsonArvore texto={mensagem.bruto} />
            </div>
          )}
        </div>
      </article>
    </li>
  )
}
