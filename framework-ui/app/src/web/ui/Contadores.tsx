import type { Placar } from '../../shared/tipos'
import type { Situacao } from '../util/veredito'
import { IconeVeredito } from './IconeVeredito'

const ordem: [Situacao, keyof Placar][] = [
  ['NAO_EXECUTADO', 'nao_executado'],
  ['PASSOU', 'passou'],
  ['FALHOU', 'falhou'],
  ['PENDENTE', 'pendente'],
  ['BLOQUEADO', 'bloqueado'],
]

export function Contadores({ placar }: { placar: Placar | null }) {
  return (
    <div className="flex items-center gap-3">
      {ordem.map(([situacao, campo]) => {
        const n = placar ? placar[campo] : null
        return (
          <div key={campo} className="flex w-5 flex-col items-center gap-1">
            <IconeVeredito situacao={situacao} tamanho={13} />
            <span className={`text-[11px] tabular-nums ${n ? 'text-texto' : 'text-texto-3'}`}>{n ? n : '-'}</span>
          </div>
        )
      })}
    </div>
  )
}
