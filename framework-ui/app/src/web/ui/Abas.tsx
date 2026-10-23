type Props<T extends string> = {
  opcoes: { valor: T; rotulo: string; contagem?: number }[]
  valor: T
  aoMudar: (v: T) => void
}

export function Abas<T extends string>({ opcoes, valor, aoMudar }: Props<T>) {
  return (
    <div className="flex items-center gap-1">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => aoMudar(o.valor)}
          className={`h-6 cursor-pointer rounded-md px-2 text-[11px] whitespace-nowrap transition-colors ${
            o.valor === valor ? 'bg-superficie-3 font-medium text-texto' : 'text-texto-2 hover:text-texto'
          }`}
        >
          {o.rotulo}
          {o.contagem !== undefined && <span className="ml-1.5 text-texto-3 tabular-nums">{o.contagem}</span>}
        </button>
      ))}
    </div>
  )
}
