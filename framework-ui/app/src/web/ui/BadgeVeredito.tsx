import { cor, rotulo, type Situacao } from '../util/veredito'
import { IconeVeredito } from './IconeVeredito'

export function BadgeVeredito({ situacao }: { situacao: Situacao | 'EXECUTANDO' }) {
  const c = situacao === 'EXECUTANDO' ? 'var(--color-acento-forte)' : cor[situacao]
  return (
    <span
      className="inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium whitespace-nowrap"
      style={{
        color: `color-mix(in srgb, ${c} 80%, white)`,
        background: `color-mix(in srgb, ${c} 16%, transparent)`,
        borderColor: `color-mix(in srgb, ${c} 32%, transparent)`,
      }}
    >
      <IconeVeredito situacao={situacao} tamanho={12} />
      {situacao === 'EXECUTANDO' ? 'Executando' : rotulo[situacao]}
    </span>
  )
}
