import { Activity, ChevronRight, CircleDollarSign, CircleStop, Hourglass, Loader2, RefreshCw, SquareTerminal, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { SessaoAgente, SituacaoSessao } from '../../../shared/tipos'
import { useSessoes } from '../../api/consultas'
import { Topo } from '../../shell/Topo'
import { Carregando, Erro, Vazio } from '../../ui/Estado'
import { caminhos, useRota } from '../../util/caminhos'
import { custo, dataCurta, plural, slugCurto } from '../../util/formato'

const selos: Record<SituacaoSessao, { classe: string; rotulo: string }> = {
  executando: { classe: 'bg-acento-suave text-acento-forte', rotulo: 'executando' },
  aguardando: { classe: 'bg-pendente/15 text-pendente', rotulo: 'aguardando o MC' },
  parada: { classe: 'bg-superficie-2 text-texto-3', rotulo: 'parada' },
}

function SeloSituacao({ situacao }: { situacao: SituacaoSessao }) {
  const { classe, rotulo } = selos[situacao]
  const Icone = situacao === 'executando' ? Loader2 : situacao === 'aguardando' ? Hourglass : CircleStop
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${classe}`}>
      <Icone size={10} className={situacao === 'executando' ? 'animate-spin' : ''} />
      {rotulo}
    </span>
  )
}

function Metrica({ icone: Icone, cor, children }: { icone: LucideIcon; cor: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-texto-2 tabular-nums">
      <Icone size={12} className={`shrink-0 ${cor}`} />
      {children}
    </span>
  )
}

function LinhaSessao({ sessao }: { sessao: SessaoAgente }) {
  const { p } = useRota()
  return (
    <Link
      to={caminhos.sessao(p, sessao.item)}
      className="group grid grid-cols-[28px_minmax(0,1fr)_120px_150px_130px_16px] items-center gap-4 border-b border-borda px-6 py-3 hover:bg-superficie"
    >
      <span className="flex size-7 items-center justify-center rounded-md border border-borda-forte text-texto-2">
        <SquareTerminal size={13} />
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 truncate">
          <span className="text-[11px] font-medium text-acento-forte">{sessao.item}</span>
          <span className="truncate text-[13px]">{sessao.titulo ?? 'Sessão sem título'}</span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-texto-3">
          {sessao.dossie ? `#${sessao.dossie.split('/')[0]} · ${slugCurto(sessao.dossie.split('/')[1])}` : 'sem dossiê ainda'}
        </div>
      </div>
      <Metrica icone={Activity} cor="text-info">
        {plural(sessao.eventos, 'evento', 'eventos')}
      </Metrica>
      <span className="flex flex-col gap-1">
        <Metrica icone={RefreshCw} cor="text-acento-forte">
          {plural(sessao.rodadas, 'rodada', 'rodadas')}
        </Metrica>
        <Metrica icone={CircleDollarSign} cor="text-passou">
          {custo(sessao.custo)}
        </Metrica>
      </span>
      <span className="flex flex-col items-end gap-1">
        <SeloSituacao situacao={sessao.situacao} />
        <span className="text-[10px] text-texto-3">{dataCurta(sessao.atualizada_em)}</span>
      </span>
      <ChevronRight size={14} className="text-texto-3 opacity-0 group-hover:opacity-100" />
    </Link>
  )
}

export function Sessoes() {
  const { p } = useRota()
  const { data, isPending, error } = useSessoes(p)

  return (
    <>
      <Topo migalhas={[{ rotulo: 'Sessões' }]} />
      <div className="flex items-center justify-between border-b border-borda px-6 pb-3">
        <span className="text-[12px] text-texto-2">{data ? plural(data.length, 'sessão', 'sessões') : ''}</span>
        <span className="text-[11px] text-texto-3">log de cada agente conduzido pela ponte, ao vivo</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending && <Carregando />}
        {error && <Erro erro={error} />}
        {data && !data.length && (
          <Vazio texto="Nenhum log em .agents-bridge/data/logs. A ponte de agentes grava um arquivo por demanda enquanto o agente roda." />
        )}
        {data?.map((s) => (
          <LinhaSessao key={s.item} sessao={s} />
        ))}
      </div>
    </>
  )
}
