import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import { ArrowDownToLine, Eraser, History, Search } from 'lucide-react'
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { App } from '../../../shared/tipos'
import { useLogAnterior } from '../../api/consultas'
import { useLogApp } from '../../api/eventos'
import { useRota } from '../../util/caminhos'
import { duracao, plural } from '../../util/formato'

const NENHUMA: string[] = []

const ERRO = /\b(ERROR|FATAL|SEVERE|Exception|Error:|ERR!)\b|^\s+at /
const AVISO = /\b(WARN|WARNING)\b/

function corDa(linha: string): string {
  if (linha.startsWith('# ')) return 'text-term-claude'
  if (linha.startsWith('$ ')) return 'text-term-agua'
  if (ERRO.test(linha)) return 'text-term-erro'
  if (AVISO.test(linha)) return 'text-term-ambar'
  return ''
}

const Linha = memo(function Linha({ texto }: { texto: string }) {
  return <div className={`break-all whitespace-pre-wrap ${corDa(texto)}`}>{texto || ' '}</div>
})

function Ferramenta({ ativo, titulo, onClick, children }: { ativo?: boolean; titulo: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={titulo}
      onClick={onClick}
      className={`inline-flex h-7 cursor-pointer items-center gap-1.5 rounded px-2 text-[11.5px] ${
        ativo ? 'bg-term-entrada text-term-texto' : 'text-term-dim hover:bg-term-entrada/60 hover:text-term-texto'
      }`}
    >
      {children}
    </button>
  )
}

export function ConsoleApp({ app }: { app: App }) {
  const { p } = useRota()
  const ao_vivo = useLogApp(p, app.nome)
  const [anterior, setAnterior] = useState(false)
  const { data: logAnterior } = useLogAnterior(p, app.nome, anterior)
  const [filtro, setFiltro] = useState('')
  const [seguir, setSeguir] = useState(true)
  const rolagem = useRef<HTMLDivElement>(null)

  const fonte = anterior ? (logAnterior?.linhas ?? NENHUMA) : ao_vivo.linhas
  const linhas = useMemo(() => {
    const f = filtro.trim().toLowerCase()
    return f ? fonte.filter((l) => l.toLowerCase().includes(f)) : fonte
  }, [fonte, filtro])

  useEffect(() => {
    const el = rolagem.current
    if (el && seguir) el.scrollTop = el.scrollHeight
  }, [linhas, seguir])

  const status: ReactNode[] = []
  if (anterior) status.push(<span className="text-term-ambar">log da subida anterior</span>)
  else if (!ao_vivo.conectado) status.push(<span className="text-term-dim">reconectando…</span>)
  else status.push(<span className="text-term-ok">● ao vivo</span>)
  if (app.pid) status.push(<span className="text-term-dim">pid {app.pid}</span>)
  if (app.porta) status.push(<span className="text-term-dim">porta {app.porta}</span>)
  if (app.iniciada_em && (app.situacao === 'no_ar' || app.situacao === 'subindo')) status.push(<span className="text-term-dim">no ar há {duracao(app.iniciada_em)}</span>)
  if (app.situacao === 'falhou' && app.erro) status.push(<span className="text-term-erro">{app.erro}</span>)
  status.push(<span className="text-term-dim">{plural(linhas.length, 'linha', 'linhas')}</span>)

  return (
    <div className="flex min-w-0 flex-1 flex-col p-5">
      <div className="term flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-term-borda bg-term-fundo shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-term-borda px-3 text-[12.5px]">
          <span className="truncate font-bold text-term-dim" title={`${app.pasta} · ${app.comando}`}>
            {app.nome} <span className="font-normal text-term-apagado">· {app.comando}</span>
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <label className="flex h-7 items-center gap-1.5 rounded bg-term-entrada/60 px-2 text-term-dim focus-within:text-term-texto">
              <Search size={12} />
              <input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="filtrar"
                className="w-36 bg-transparent text-[11.5px] text-term-texto outline-none placeholder:text-term-apagado"
              />
            </label>
            <Ferramenta titulo="Limpar a visão: segue mostrando só o que chegar daqui em diante" onClick={ao_vivo.limpar}>
              <Eraser size={13} />
              Limpar
            </Ferramenta>
            <Ferramenta ativo={seguir} titulo="Rolar junto com o log" onClick={() => setSeguir(!seguir)}>
              <ArrowDownToLine size={13} />
              Seguir
            </Ferramenta>
            <Ferramenta ativo={anterior} titulo="Log da subida anterior" onClick={() => setAnterior(!anterior)}>
              <History size={13} />
              Anterior
            </Ferramenta>
          </div>
        </div>

        <div
          ref={rolagem}
          onWheel={(e) => e.deltaY < 0 && setSeguir(false)}
          onScroll={(e) => {
            const el = e.currentTarget
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 8) setSeguir(true)
          }}
          className="min-h-0 flex-1 overflow-y-auto px-[1.5ch] py-2 text-[12.5px] leading-[1.55]"
        >
          {(anterior ? logAnterior?.cortado : ao_vivo.cortado) && <div className="text-term-apagado">… linhas mais antigas omitidas</div>}
          {linhas.map((l, i) => (
            <Linha key={i} texto={l} />
          ))}
          {!linhas.length && (
            <div className="text-term-apagado">
              {filtro ? 'nenhuma linha com esse filtro' : anterior ? 'sem log anterior' : app.situacao === 'parada' ? 'aplicação parada: o log aparece aqui ao subir' : 'aguardando saída…'}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-[1ch] overflow-hidden border-t border-term-borda px-[1.5ch] py-1.5 text-[11.5px] whitespace-nowrap">
          {status.map((s, i) => (
            <span key={i} className="flex items-center gap-[1ch]">
              {i > 0 && <span className="text-term-apagado">·</span>}
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
