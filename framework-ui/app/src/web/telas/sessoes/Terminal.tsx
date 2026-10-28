import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import { Folder } from 'lucide-react'
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { EventoSessao, SessaoAgente } from '../../../shared/tipos'
import { useEventosSessao } from '../../api/eventos'
import { useSessoes } from '../../api/consultas'
import { Topo } from '../../shell/Topo'
import { Markdown } from '../../ui/Markdown'
import { caminhos, useRota } from '../../util/caminhos'
import { custo, dataCompleta, plural } from '../../util/formato'
import { montarTerminal, type Bloco } from './blocos'

const hm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

// Linha com marcador na primeira coluna; o corpo quebra recuado por baixo dele, como no terminal.
function Linha({ marca, cor, recuo = 0, children, titulo }: { marca: string; cor: string; recuo?: number; children: ReactNode; titulo?: string }) {
  return (
    <div className="grid grid-cols-[2ch_minmax(0,1fr)]" style={{ paddingLeft: `${recuo}ch` }} title={titulo}>
      <span className={cor}>{marca}</span>
      <div className="min-w-0 break-words">{children}</div>
    </div>
  )
}

const recuoDe = (e: EventoSessao) => (e.agent ? 4 : 0)
const Rotulo = ({ agente }: { agente?: string | null }) => (agente ? <span className="text-term-claude">{agente} · </span> : null)

const DIFF_VISIVEL = 12

function Saida({ resultado, recuo }: { resultado: EventoSessao; recuo: number }) {
  const [aberto, setAberto] = useState(false)
  const diff = resultado.diff ?? []
  const largura = Math.max(0, ...diff.map((d) => String(d.n ?? '').length))
  const linhasDiff = aberto ? diff : diff.slice(0, DIFF_VISIVEL)
  const cor = resultado.error ? 'text-term-erro' : 'text-term-dim'
  if (!resultado.summary && !resultado.output?.length && !diff.length) return null
  return (
    <div className="grid grid-cols-[3ch_minmax(0,1fr)]" style={{ paddingLeft: `${recuo + 2}ch` }}>
      <span className="text-term-dim">⎿</span>
      <div className="min-w-0">
        {resultado.summary && <div className={cor}>{resultado.summary}</div>}
        {resultado.output?.map((l, i) => (
          <div key={i} className={`break-all whitespace-pre-wrap ${/^… \+\d+ linhas?$/.test(l.trim()) ? 'text-term-apagado' : cor}`}>
            {l.replace(/\r$/, '') || ' '}
          </div>
        ))}
        {linhasDiff.map((d, i) =>
          d.op === 'gap' ? (
            <div key={i} className="text-term-apagado">
              …
            </div>
          ) : (
            <div
              key={i}
              style={{ paddingLeft: `${largura + 3}ch`, textIndent: `-${largura + 3}ch` }}
              className={`break-all whitespace-pre-wrap ${d.op === '+' ? 'bg-term-mais' : d.op === '-' ? 'bg-term-menos' : 'text-term-dim'}`}
            >
              {`${String(d.n ?? '').padStart(largura)} ${d.op} ${d.text}`}
            </div>
          ),
        )}
        {diff.length > DIFF_VISIVEL && (
          <button type="button" onClick={() => setAberto(!aberto)} className="cursor-pointer text-term-apagado hover:text-term-dim">
            {aberto ? '… recolher' : `… +${diff.length - DIFF_VISIVEL} linhas (clique para expandir)`}
          </button>
        )}
      </div>
    </div>
  )
}

const marcasAgente: Record<string, [string, string, string]> = {
  started: ['▸', 'text-term-claude', 'começou'],
  progress: ['·', 'text-term-apagado', ''],
  completed: ['✓', 'text-term-ok', 'concluiu'],
  failed: ['✗', 'text-term-erro', 'falhou'],
  stopped: ['■', 'text-term-erro', 'parado'],
}

function Evento({ e }: { e: EventoSessao }) {
  const recuo = recuoDe(e)
  switch (e.kind) {
    case 'prompt':
      return (
        <div className="grid grid-cols-[2ch_minmax(0,1fr)] bg-term-entrada px-[1ch] py-0.5">
          <span className="text-term-dim">&gt;</span>
          <span className="break-words whitespace-pre-wrap">{e.text}</span>
        </div>
      )
    case 'text':
      return (
        <Linha marca="●" cor="text-term-texto" recuo={recuo}>
          {e.agent && <Rotulo agente={e.agent} />}
          <Markdown texto={e.text ?? ''} />
        </Linha>
      )
    case 'agent': {
      const [marca, cor, verbo] = marcasAgente[e.status ?? ''] ?? ['·', 'text-term-dim', '']
      return (
        <Linha marca={marca} cor={cor} recuo={4}>
          <span className={cor}>{e.agent} </span>
          <span className="text-term-dim">{[verbo, e.detail].filter(Boolean).join(' · ')}</span>
        </Linha>
      )
    }
    case 'question':
    case 'answer': {
      const pergunta = e.kind === 'question'
      return (
        <>
          <Linha marca="◆" cor={pergunta ? 'text-term-ambar' : 'text-term-ok'}>
            <span className={`font-bold ${pergunta ? 'text-term-ambar' : 'text-term-ok'}`}>{pergunta ? 'Pergunta no MC' : 'Resposta'} </span>
            <span className="text-term-dim">{pergunta ? e.id : `${e.id} · ${e.verdict}`}</span>
          </Linha>
          <div className="pl-[2ch]">
            <Markdown texto={e.text ?? ''} />
          </div>
        </>
      )
    }
    case 'turn':
      return (
        <div className="text-term-dim">
          <span className="text-term-claude">✻</span> Rodada {e.status === 'success' ? 'concluída' : e.status} em {e.seconds}s · {custo(e.cost ?? 0)} ·{' '}
          {hm(e.at)}
        </div>
      )
    case 'error':
      return (
        <Linha marca="●" cor="text-term-erro" recuo={recuo}>
          <span className="text-term-erro">{e.text}</span>
        </Linha>
      )
    default:
      return (
        <Linha marca="※" cor="text-term-apagado" recuo={recuo}>
          <span className="text-term-dim">
            {e.text} · {hm(e.at)}
          </span>
        </Linha>
      )
  }
}

const BlocoTerminal = memo(function BlocoTerminal({ bloco, ativa }: { bloco: Bloco; ativa: boolean }) {
  if (bloco.tipo === 'evento') {
    const e = bloco.evento
    return (
      <div className={`term-bloco ${e.kind === 'agent' ? '' : 'mt-[1.1em]'}`} title={dataCompleta(e.at)}>
        <Evento e={e} />
      </div>
    )
  }
  const { chamada, resultado } = bloco
  const recuo = recuoDe(chamada)
  const cor = !resultado ? `text-term-apagado ${ativa ? 'animate-pulse' : ''}` : resultado.error ? 'text-term-erro' : 'text-term-azul'
  return (
    <div className="term-bloco mt-[1.1em]" title={dataCompleta(chamada.at)}>
      <Linha marca="●" cor={cor} recuo={recuo}>
        <Rotulo agente={chamada.agent} />
        <span className="font-bold">{chamada.name}</span>
        {chamada.detail && <span>({chamada.detail})</span>}
      </Linha>
      {resultado && <Saida resultado={resultado} recuo={recuo} />}
    </div>
  )
})

function Status({ sessao, subagentes, conectado }: { sessao: SessaoAgente | undefined; subagentes: number; conectado: boolean }) {
  const partes: ReactNode[] = []
  if (!conectado) partes.push(<span className="text-term-dim">reconectando…</span>)
  else if (sessao?.situacao === 'executando') partes.push(<span className="text-term-claude">▶▶ executando</span>)
  else if (sessao?.situacao === 'aguardando')
    partes.push(<span className="text-term-ambar">◆ {plural(sessao.perguntas_abertas, 'pergunta aguardando', 'perguntas aguardando')} o MC</span>)
  else partes.push(<span className="text-term-dim">■ parada</span>)
  if (subagentes) partes.push(<span className="text-term-agua">{plural(subagentes, 'subagente', 'subagentes')} em segundo plano</span>)
  if (sessao) partes.push(<span className="text-term-dim">{plural(sessao.rodadas, 'rodada', 'rodadas')} · {custo(sessao.custo)}</span>)
  return (
    <div className="px-[3ch] py-2">
      {partes.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="text-term-dim"> · </span>}
          {p}
        </span>
      ))}
    </div>
  )
}

function Relogio() {
  const [agora, setAgora] = useState(() => new Date().toISOString())
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date().toISOString()), 15_000)
    return () => clearInterval(t)
  }, [])
  return <span className="text-term-azul">{hm(agora)}</span>
}

// Janela de abas em volta da sessão aberta; as pontas dizem quantas ficaram de fora e saltam uma janela.
const VIZINHAS = 3
const JANELA = VIZINHAS * 2 + 1

function Abas({ sessoes, atual }: { sessoes: SessaoAgente[]; atual: string }) {
  const { p } = useRota()
  const indice = Math.max(0, sessoes.findIndex((s) => s.item === atual))
  const ini = Math.max(0, Math.min(indice - VIZINHAS, sessoes.length - JANELA))
  const fim = Math.min(sessoes.length, ini + JANELA)
  const salto = (alvo: number, rotulo: string, titulo: string) => (
    <Link to={caminhos.sessao(p, sessoes[alvo].item)} title={titulo} className="px-[1ch] text-term-dim hover:text-term-texto">
      {rotulo}
    </Link>
  )
  return (
    <div className="flex items-center gap-[1ch] bg-[#2a2a2a] pr-[1ch] whitespace-nowrap">
      <span className="pl-[1ch] text-term-claude">✻</span>
      <span className="text-term-dim">|</span>
      {ini > 0 && salto(Math.max(0, indice - JANELA), `‹ ${ini}`, `${ini} sessões mais recentes`)}
      <div className="flex min-w-0 gap-[1ch] overflow-hidden">
        {sessoes.slice(ini, fim).map((s, i) => (
          <Link
            key={s.item}
            to={caminhos.sessao(p, s.item)}
            title={s.titulo ?? s.item}
            className={`px-[1ch] ${s.item === atual ? 'bg-term-entrada text-term-agua' : 'text-term-dim hover:text-term-texto'}`}
          >
            {ini + i + 1}:{s.item}
            {s.situacao !== 'parada' && <span className={s.situacao === 'executando' ? 'text-term-claude' : 'text-term-ambar'}>*</span>}
          </Link>
        ))}
      </div>
      {fim < sessoes.length &&
        salto(Math.min(sessoes.length - 1, indice + JANELA), `${sessoes.length - fim} ›`, `${sessoes.length - fim} sessões mais antigas`)}
      <span className="ml-auto pl-[2ch] text-term-dim">
        {indice + 1}/{sessoes.length}
      </span>
      <span className="text-term-azul">|</span>
      <Relogio />
    </div>
  )
}

export function Terminal() {
  const { p, item } = useRota()
  const { eventos, conectado } = useEventosSessao(p, item)
  const { data: sessoes = [] } = useSessoes(p)
  const sessao = sessoes.find((s) => s.item === item)
  const { blocos, subagentesAtivos } = useMemo(() => montarTerminal(eventos), [eventos])
  const ativa = sessao?.situacao === 'executando'
  const rolagem = useRef<HTMLDivElement>(null)
  const noFim = useRef(true)

  // Evento novo rola até o fim só para quem já estava lá; quem subiu para ler não perde o lugar.
  useEffect(() => {
    const el = rolagem.current
    if (el && noFim.current) el.scrollTop = el.scrollHeight
  }, [eventos.length])

  return (
    <>
      <Topo migalhas={[{ rotulo: item }]} />
      <div className="flex min-h-0 flex-1 flex-col border-t border-borda p-5">
        <div className="term mx-auto flex min-h-0 w-full max-w-[1180px] flex-1 flex-col overflow-hidden rounded-xl border border-term-borda bg-term-fundo shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
          <div className="flex h-10 shrink-0 items-center gap-2 px-4 text-[12.5px]">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
            <Folder size={14} className="ml-3 fill-term-azul/60 text-term-azul" />
            <span className="truncate font-bold text-term-dim">
              [{p}] <span className="text-term-claude">✻</span>:{item}
              {sessao?.titulo && <span className="font-normal"> [{sessao.titulo}]</span>}
            </span>
          </div>

          <div
            ref={rolagem}
            onScroll={(e) => {
              const el = e.currentTarget
              noFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
            }}
            className="min-h-0 flex-1 overflow-y-auto px-[1ch] pb-4"
          >
            {!conectado && !eventos.length && <div className="mt-3 text-term-dim">conectando à sessão {item}…</div>}
            {blocos.map((b) => (
              <BlocoTerminal key={b.chave} bloco={b} ativa={ativa} />
            ))}
            {ativa && (
              <div className="mt-[1.1em] text-term-claude">
                <span className="inline-block animate-pulse">✻</span> <span className="text-term-dim">Trabalhando…</span>
              </div>
            )}
          </div>

          <div className="mx-[1ch] flex items-center border-y border-term-borda py-2">
            <span className="w-[2ch] text-term-dim">&gt;</span>
            <span className="inline-block h-[1.2em] w-[1ch] animate-pulse bg-term-texto/80" />
            <span className="ml-[1ch] truncate text-term-apagado">somente leitura: a sessão conversa pelo Mission Control</span>
            <span className="ml-auto pl-[2ch] whitespace-nowrap text-term-dim">acompanhando ao vivo</span>
          </div>
          <Status sessao={sessao} subagentes={subagentesAtivos} conectado={conectado} />
          <Abas sessoes={sessoes} atual={item} />
        </div>
      </div>
    </>
  )
}
