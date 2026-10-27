import { CircleDashed, CircleCheck, Layers, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { EstadoAtual, Placar, Rodada } from '../../../shared/tipos'
import { Vazio } from '../../ui/Estado'
import { dataCurta, dataDia } from '../../util/formato'
import { executados, percentual, statusRodada } from '../../util/veredito'

type Linha = { placar: Placar; ativa: boolean; aoEscolher: () => void; titulo: ReactNode; situacao: ReactNode }

function ItemLista({ placar, ativa, aoEscolher, titulo, situacao }: Linha) {
  const progresso = placar.total ? executados(placar) / placar.total : 0
  return (
    <button
      type="button"
      onClick={aoEscolher}
      className={`relative block w-full cursor-pointer rounded-md px-3 py-2.5 text-left transition-colors ${
        ativa ? 'bg-superficie-3' : 'hover:bg-superficie'
      }`}
    >
      <div className="flex items-baseline gap-1.5 truncate text-[12.5px]">{titulo}</div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-texto-3">
        {situacao}
        <span className="flex items-center gap-1 text-texto">
          <CircleCheck size={12} className="text-passou" />
          {percentual(placar)}%
        </span>
        <span className="flex items-center gap-1 text-texto-2" title="Falhas">
          <CircleDashed size={12} className="text-falhou" />
          {percentual(placar, 'falhou')}%
        </span>
      </div>
      {ativa && <span className="absolute bottom-0 left-3 h-px bg-acento" style={{ width: `${Math.max(progresso, 0.08) * 40}%` }} />}
    </button>
  )
}

const Ponto = () => <span className="text-texto-3">·</span>

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
        <ItemLista
          key={e.ambiente}
          placar={e.placar}
          ativa={e.ambiente === estadoAtivo}
          aoEscolher={() => aoEscolherEstado(e.ambiente)}
          titulo={
            <>
              <Layers size={12} className="shrink-0 self-center text-acento-forte" />
              <span className="font-medium">Estado atual</span>
              <Ponto />
              <span className="text-texto-2">{e.ambiente}</span>
            </>
          }
          situacao={<span>Atualizado {dataCurta(e.atualizado_em)}</span>}
        />
      ))}
      {estados.length > 0 && <div className="mx-3 my-1.5 h-px bg-borda" />}
      {rodadas.map((r) => (
        <ItemLista
          key={r.id}
          placar={r.placar}
          ativa={r.id === ativa}
          aoEscolher={() => aoEscolher(r.id)}
          titulo={
            <>
              <span className="text-texto-3">#{r.id}</span>
              <span className="font-medium">{r.ambiente}</span>
              <Ponto />
              <span className="text-texto-2">{r.origem}</span>
              <Ponto />
              <span className="text-texto-2">{dataCurta(r.iniciada_em)}</span>
            </>
          }
          situacao={
            r.status === 'executando' ? (
              <span className="flex items-center gap-1 text-acento-forte">
                <Loader2 size={11} className="animate-spin" /> Executando
              </span>
            ) : (
              <span>
                {statusRodada[r.status]} {dataDia(r.finalizada_em ?? r.iniciada_em)}
              </span>
            )
          }
        />
      ))}
    </div>
  )
}
