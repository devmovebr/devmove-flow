import { ChevronRight, FileText, Server } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { Demanda } from '../../shared/tipos'
import { useDemandas } from '../api/consultas'
import { Topo } from '../shell/Topo'
import { Abas } from '../ui/Abas'
import { Contadores } from '../ui/Contadores'
import { Donut } from '../ui/Donut'
import { Carregando, Erro, Vazio } from '../ui/Estado'
import { caminhos, useRota } from '../util/caminhos'
import { dataDia, slugCurto } from '../util/formato'
import { corStatusIndex, executados, percentual, statusCurto } from '../util/veredito'

function LinhaDemanda({ demanda }: { demanda: Demanda }) {
  const { p } = useRota()
  const rodada = demanda.ultima_rodada
  const placar = demanda.estado_atual?.placar ?? null
  const progresso = placar && placar.total ? executados(placar) / placar.total : 0

  return (
    <Link
      to={caminhos.suite(p, demanda.dossie)}
      className="group relative grid grid-cols-[28px_minmax(0,1fr)_120px_150px_44px_110px_16px] items-center gap-4 border-b border-borda px-6 py-3 hover:bg-superficie"
    >
      <span className="flex size-7 items-center justify-center rounded-md border border-borda-forte text-texto-2">
        <FileText size={13} />
      </span>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2 truncate">
          <span className="text-[11px] text-texto-3">#{demanda.tipo}</span>
          <span className="truncate text-[13px]">{demanda.titulo}</span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-texto-3">
          {dataDia(demanda.data)} · {slugCurto(demanda.slug)} · {demanda.servicos || 'sem serviço'}
        </div>
        {progresso > 0 && (
          <span className="absolute bottom-[-1px] left-6 h-px bg-acento" style={{ width: `${progresso * 45}%` }} />
        )}
      </div>

      <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-texto-2">
        {rodada ? (
          <>
            <Server size={12} className="shrink-0 text-texto-3" />
            <span className="truncate">{demanda.estado_atual?.ambiente ?? rodada.ambiente}</span>
            <span className="text-texto-3">#{rodada.id}</span>
          </>
        ) : (
          <span className="text-texto-3">sem rodada</span>
        )}
      </div>

      <Contadores placar={placar} />
      <Donut valor={placar ? percentual(placar) : null} />

      <span
        title={demanda.status}
        className="truncate text-right text-[10px] font-semibold tracking-[0.06em] uppercase"
        style={{ color: corStatusIndex(demanda.status) }}
      >
        {statusCurto(demanda.status)}
      </span>
      <ChevronRight size={14} className="text-texto-3 opacity-0 group-hover:opacity-100" />
    </Link>
  )
}

export function Demandas() {
  const { p } = useRota()
  const { data, isPending, error } = useDemandas(p)
  const [filtro, setFiltro] = useState('todas')

  const lista = data ?? []
  const status = [...new Set(lista.map((d) => statusCurto(d.status)))].sort()
  const visiveis = filtro === 'todas' ? lista : lista.filter((d) => statusCurto(d.status) === filtro)

  return (
    <>
      <Topo migalhas={[{ rotulo: 'Demandas' }]} />
      <div className="flex items-center justify-between border-b border-borda px-6 pb-3">
        <Abas
          valor={filtro}
          aoMudar={setFiltro}
          opcoes={[
            { valor: 'todas', rotulo: 'Todas', contagem: lista.length },
            ...status.map((s) => ({ valor: s, rotulo: s, contagem: lista.filter((d) => statusCurto(d.status) === s).length })),
          ]}
        />
        <span className="text-[11px] text-texto-3">placar atual por cenário</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending && <Carregando />}
        {error && <Erro erro={error} />}
        {data && !visiveis.length && <Vazio texto="Nenhuma demanda com plano-teste.md neste projeto." />}
        {visiveis.map((d) => (
          <LinhaDemanda key={d.dossie} demanda={d} />
        ))}
      </div>
    </>
  )
}
