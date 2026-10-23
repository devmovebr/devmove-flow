import { CircleDashed, CircleCheck, Layers, Loader2 } from 'lucide-react'
import type { EstadoAtual, Rodada } from '../../../shared/tipos'
import { Vazio } from '../../ui/Estado'
import { dataCurta, dataDia } from '../../util/formato'
import { executados, percentual, statusRodada } from '../../util/veredito'

function LinhaRodada({ rodada, ativa, aoEscolher }: { rodada: Rodada; ativa: boolean; aoEscolher: () => void }) {
  const { placar } = rodada
  const falhas = placar.total ? Math.round((placar.falhou / placar.total) * 100) : 0
  const progresso = placar.total ? executados(placar) / placar.total : 0
  const fim = rodada.finalizada_em ?? rodada.iniciada_em

  return (
    <button
      type="button"
      onClick={aoEscolher}
      className={`relative block w-full cursor-pointer rounded-md px-3 py-2.5 text-left transition-colors ${
        ativa ? 'bg-superficie-3' : 'hover:bg-superficie'
      }`}
    >
      <div className="flex items-baseline gap-1.5 truncate text-[12.5px]">
        <span className="text-texto-3">#{rodada.id}</span>
        <span className="font-medium">{rodada.ambiente}</span>
        <span className="text-texto-3">·</span>
        <span className="text-texto-2">{rodada.origem}</span>
        <span className="text-texto-3">·</span>
        <span className="text-texto-2">{dataCurta(rodada.iniciada_em)}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-texto-3">
        {rodada.status === 'executando' ? (
          <span className="flex items-center gap-1 text-acento-forte">
            <Loader2 size={11} className="animate-spin" /> Executando
          </span>
        ) : (
          <span>
            {statusRodada[rodada.status]} {dataDia(fim)}
          </span>
        )}
        <span className="flex items-center gap-1 text-texto">
          <CircleCheck size={12} className="text-passou" />
          {percentual(placar)}%
        </span>
        <span className="flex items-center gap-1 text-texto-2" title="Falhas">
          <CircleDashed size={12} className="text-falhou" />
          {falhas}%
        </span>
      </div>
      {ativa && <span className="absolute bottom-0 left-3 h-px bg-acento" style={{ width: `${Math.max(progresso, 0.08) * 40}%` }} />}
    </button>
  )
}

function LinhaEstado({ estado, ativa, aoEscolher }: { estado: EstadoAtual; ativa: boolean; aoEscolher: () => void }) {
  const { placar } = estado
  const falhas = placar.total ? Math.round((placar.falhou / placar.total) * 100) : 0
  const progresso = placar.total ? executados(placar) / placar.total : 0

  return (
    <button
      type="button"
      onClick={aoEscolher}
      className={`relative block w-full cursor-pointer rounded-md px-3 py-2.5 text-left transition-colors ${
        ativa ? 'bg-superficie-3' : 'hover:bg-superficie'
      }`}
    >
      <div className="flex items-baseline gap-1.5 truncate text-[12.5px]">
        <Layers size={12} className="shrink-0 self-center text-acento-forte" />
        <span className="font-medium">Estado atual</span>
        <span className="text-texto-3">·</span>
        <span className="text-texto-2">{estado.ambiente}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-texto-3">
        <span>Atualizado {dataCurta(estado.atualizado_em)}</span>
        <span className="flex items-center gap-1 text-texto">
          <CircleCheck size={12} className="text-passou" />
          {percentual(placar)}%
        </span>
        <span className="flex items-center gap-1 text-texto-2" title="Falhas">
          <CircleDashed size={12} className="text-falhou" />
          {falhas}%
        </span>
      </div>
      {ativa && <span className="absolute bottom-0 left-3 h-px bg-acento" style={{ width: `${Math.max(progresso, 0.08) * 40}%` }} />}
    </button>
  )
}

type Props = {
  rodadas: Rodada[]
  estados: EstadoAtual[]
  ativa: number | null
  estadoAtivo: string | null
  aoEscolher: (id: number) => void
  aoEscolherEstado: (ambiente: string) => void
}

export function ListaRodadas({ rodadas, estados, ativa, estadoAtivo, aoEscolher, aoEscolherEstado }: Props) {
  if (!rodadas.length) return <Vazio texto="Nenhuma rodada ainda. Execute a suíte para criar a primeira." />
  return (
    <div className="flex flex-col gap-0.5 px-2">
      {estados.map((e) => (
        <LinhaEstado key={e.ambiente} estado={e} ativa={e.ambiente === estadoAtivo} aoEscolher={() => aoEscolherEstado(e.ambiente)} />
      ))}
      {estados.length > 0 && <div className="mx-3 my-1.5 h-px bg-borda" />}
      {rodadas.map((r) => (
        <LinhaRodada key={r.id} rodada={r} ativa={r.id === ativa} aoEscolher={() => aoEscolher(r.id)} />
      ))}
    </div>
  )
}
