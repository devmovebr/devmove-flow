import { useRef, type SyntheticEvent } from 'react'

type Props = {
  valor: string
  aoMudar: (v: string) => void
  conhecidas?: Set<string>
  multilinha?: boolean
  placeholder?: string
  linhas?: number
  className?: string
}

function Realce({ texto, conhecidas }: { texto: string; conhecidas?: Set<string> }) {
  const partes = texto.split(/(\{\{[A-Za-z0-9_]+\}\})/g)
  return (
    <>
      {partes.map((parte, i) => {
        const nome = /^\{\{([A-Za-z0-9_]+)\}\}$/.exec(parte)?.[1]
        if (!nome) return <span key={i}>{parte}</span>
        const definida = !conhecidas || conhecidas.has(nome)
        return (
          <span key={i} className={`rounded-[3px] ${definida ? 'bg-acento-suave text-acento-forte' : 'bg-pendente/15 text-pendente'}`}>
            {parte}
          </span>
        )
      })}
      {'\n'}
    </>
  )
}

// Input transparente sobre um <pre> que pinta as {{VARIAVEIS}}.
export function CampoVariavel({ valor, aoMudar, conhecidas, multilinha, placeholder, linhas = 8, className = '' }: Props) {
  const camada = useRef<HTMLPreElement>(null)
  const sincronizar = (e: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!camada.current) return
    camada.current.scrollTop = e.currentTarget.scrollTop
    camada.current.scrollLeft = e.currentTarget.scrollLeft
  }
  const base = 'm-0 w-full border-0 px-2.5 py-1.5 outline-none'

  return (
    <div className={`campo-variavel relative min-w-0 ${className}`}>
      <pre
        ref={camada}
        aria-hidden
        className={`${base} pointer-events-none absolute inset-0 overflow-hidden text-texto ${multilinha ? 'break-words whitespace-pre-wrap' : 'whitespace-pre'}`}
      >
        <Realce texto={valor} conhecidas={conhecidas} />
      </pre>
      {multilinha ? (
        <textarea
          value={valor}
          rows={linhas}
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => aoMudar(e.target.value)}
          onScroll={sincronizar}
          className={`${base} relative block resize-y bg-transparent text-transparent caret-texto placeholder:text-texto-3`}
        />
      ) : (
        <input
          value={valor}
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => aoMudar(e.target.value)}
          onScroll={sincronizar}
          onSelect={sincronizar}
          className={`${base} relative block h-8 bg-transparent text-transparent caret-texto placeholder:text-texto-3`}
        />
      )}
    </div>
  )
}
