import { ChevronDown, ChevronRight } from 'lucide-react'
import { memo, useState } from 'react'

function Primitivo({ valor }: { valor: unknown }) {
  if (valor === null) return <span className="text-texto-3">null</span>
  if (typeof valor === 'string') return <span className="text-[#9fd59f]">"{valor}"</span>
  if (typeof valor === 'number') return <span className="text-[#e8b06a]">{valor}</span>
  if (typeof valor === 'boolean') return <span className="text-[#c792ea]">{String(valor)}</span>
  return <span>{String(valor)}</span>
}

function No({ chave, valor, nivel, ultimo }: { chave?: string; valor: unknown; nivel: number; ultimo: boolean }) {
  const [aberto, setAberto] = useState(nivel < 3)
  const virgula = ultimo ? '' : ','
  const rotulo = chave !== undefined && <span className="text-[#8fb4f0]">"{chave}"</span>
  const recuo = { paddingLeft: nivel * 14 }
  const recuoFolha = { paddingLeft: nivel * 14 + 16 }

  if (valor === null || typeof valor !== 'object') {
    return (
      <div style={recuoFolha}>
        <span>
          {rotulo}
          {rotulo && ': '}
          <Primitivo valor={valor} />
          {virgula}
        </span>
      </div>
    )
  }

  const lista = Array.isArray(valor)
  const entradas = lista ? valor.map((v, i) => [String(i), v] as const) : Object.entries(valor as Record<string, unknown>)
  const [abre, fecha] = lista ? ['[', ']'] : ['{', '}']

  return (
    <div>
      <div style={recuo} className="flex items-center">
        <button type="button" onClick={() => setAberto(!aberto)} className="flex w-4 cursor-pointer justify-center text-texto-3 hover:text-texto">
          {aberto ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        <span>
          {rotulo}
          {rotulo && ': '}
          {abre}
          {!aberto && (
            <button type="button" onClick={() => setAberto(true)} className="cursor-pointer px-1 text-texto-3 hover:text-texto">
              {lista ? `${entradas.length} itens` : '...'}
            </button>
          )}
          {!aberto && `${fecha}${virgula}`}
        </span>
      </div>
      {aberto && (
        <>
          {entradas.map(([k, v], i) => (
            <No key={k} chave={lista ? undefined : k} valor={v} nivel={nivel + 1} ultimo={i === entradas.length - 1} />
          ))}
          <div style={recuoFolha}>
            {fecha}
            {virgula}
          </div>
        </>
      )}
    </div>
  )
}

export const JsonArvore = memo(function JsonArvore({ texto }: { texto: string }) {
  let valor: unknown
  try {
    valor = JSON.parse(texto)
  } catch {
    return <pre className="font-mono text-[12px] break-words whitespace-pre-wrap text-texto-2">{texto || 'Corpo vazio'}</pre>
  }
  return (
    <div className="font-mono text-[12px] leading-[20px] text-texto-2">
      <No valor={valor} nivel={0} ultimo />
    </div>
  )
})
