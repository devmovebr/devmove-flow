import { ChevronRight, Hourglass, MessagesSquare } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { ConversaMc } from '../../../shared/tipos'
import { useConversas } from '../../api/consultas'
import { Topo } from '../../shell/Topo'
import { Abas } from '../../ui/Abas'
import { Carregando, Erro, Vazio } from '../../ui/Estado'
import { caminhos, useRota } from '../../util/caminhos'
import { dataCurta, slugCurto } from '../../util/formato'

export function SeloAguardando({ n }: { n: number }) {
  if (!n) return <span className="text-[10px] font-semibold tracking-[0.06em] text-texto-3 uppercase">em dia</span>
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-pendente/15 px-2 py-0.5 text-[10px] font-medium text-pendente">
      <Hourglass size={10} />
      {n} aguardando
    </span>
  )
}

function LinhaConversa({ conversa }: { conversa: ConversaMc }) {
  const { p } = useRota()
  return (
    <Link
      to={caminhos.conversa(p, conversa.dossie)}
      className="group grid grid-cols-[28px_minmax(0,1fr)_110px_120px_130px_16px] items-center gap-4 border-b border-borda px-6 py-3 hover:bg-superficie"
    >
      <span className="flex size-7 items-center justify-center rounded-md border border-borda-forte text-texto-2">
        <MessagesSquare size={13} />
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 truncate">
          {conversa.item && <span className="text-[11px] font-medium text-acento-forte">{conversa.item}</span>}
          <span className="truncate text-[13px]">{conversa.titulo}</span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-texto-3">
          #{conversa.tipo} · {slugCurto(conversa.slug)}
        </div>
      </div>
      <span className="text-[11px] text-texto-2 tabular-nums">
        {conversa.total} {conversa.total === 1 ? 'mensagem' : 'mensagens'}
      </span>
      <span className="text-[11px] text-texto-3">{conversa.ultima_em ? dataCurta(conversa.ultima_em) : '-'}</span>
      <span className="text-right">
        <SeloAguardando n={conversa.aguardando} />
      </span>
      <ChevronRight size={14} className="text-texto-3 opacity-0 group-hover:opacity-100" />
    </Link>
  )
}

export function Conversas() {
  const { p } = useRota()
  const { data, isPending, error } = useConversas(p)
  const [filtro, setFiltro] = useState<'todas' | 'aguardando'>('todas')

  const lista = data ?? []
  const comPergunta = lista.filter((c) => c.aguardando > 0)
  const visiveis = filtro === 'todas' ? lista : comPergunta

  return (
    <>
      <Topo migalhas={[{ rotulo: 'Demandas' }]} />
      <div className="flex items-center justify-between border-b border-borda px-6 pb-3">
        <Abas
          valor={filtro}
          aoMudar={setFiltro}
          opcoes={[
            { valor: 'todas', rotulo: 'Todas', contagem: lista.length },
            { valor: 'aguardando', rotulo: 'Aguardando resposta', contagem: comPergunta.length },
          ]}
        />
        <span className="text-[11px] text-texto-3">troca com o Mission Control, ao vivo</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending && <Carregando />}
        {error && <Erro erro={error} />}
        {data && !visiveis.length && (
          <Vazio
            texto={
              filtro === 'todas'
                ? 'Nenhuma demanda com mensagens-mc.md neste projeto. A ponte de agentes cria o arquivo quando a demanda vem do Mission Control.'
                : 'Nenhuma pergunta aguardando resposta no Mission Control.'
            }
          />
        )}
        {visiveis.map((c) => (
          <LinhaConversa key={c.dossie} conversa={c} />
        ))}
      </div>
    </>
  )
}
