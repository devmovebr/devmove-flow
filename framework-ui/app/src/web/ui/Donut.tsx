import { Check } from 'lucide-react'

type Props = { valor: number | null; tamanho?: number }

export function Donut({ valor, tamanho = 34 }: Props) {
  const traco = 3
  const r = (tamanho - traco) / 2
  const circ = 2 * Math.PI * r
  const completo = valor === 100
  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--color-superficie-3)" strokeWidth={traco} />
        {valor !== null && valor > 0 && (
          <circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={r}
            fill="none"
            stroke="var(--color-passou)"
            strokeWidth={traco}
            strokeLinecap="round"
            strokeDasharray={`${(circ * valor) / 100} ${circ}`}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
        {valor === null ? (
          <span className="text-texto-3">-</span>
        ) : completo ? (
          <Check size={14} strokeWidth={3} className="text-passou" />
        ) : (
          `${valor}%`
        )}
      </span>
    </div>
  )
}
