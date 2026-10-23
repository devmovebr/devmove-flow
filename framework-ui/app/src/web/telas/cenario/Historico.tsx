import { History } from 'lucide-react'
import type { Execucao } from '../../../shared/tipos'
import { Avatar } from '../../ui/Avatar'
import { Carregando, Erro } from '../../ui/Estado'
import { IconeVeredito } from '../../ui/IconeVeredito'
import { dataCurta, tempo } from '../../util/formato'
import { EdicaoVeredito } from './EdicaoVeredito'

type Props = {
  execucoes: Execucao[] | undefined
  carregando: boolean
  erro: unknown
  selecionada: number | null
  aoEscolher: (id: number) => void
}

export function Historico({ execucoes, carregando, erro, selecionada, aoEscolher }: Props) {
  const ultima = execucoes?.[0]
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-borda">
      {ultima && <EdicaoVeredito key={`${ultima.id}-${ultima.veredito}-${ultima.nota}`} execucao={ultima} />}
      <div className="flex h-10 items-center gap-2 px-4 text-[12px] font-medium">
        <History size={13} className="text-texto-3" />
        Histórico
        <span className="text-[11px] font-normal text-texto-3">{execucoes?.length ?? ''}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {carregando && <Carregando />}
        {erro ? <Erro erro={erro} /> : null}
        {execucoes && !execucoes.length && <p className="px-2 py-6 text-center text-texto-3">Ainda não executado.</p>}
        {execucoes?.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => aoEscolher(e.id)}
            className={`flex w-full cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-left ${e.id === selecionada ? 'bg-superficie-3' : 'hover:bg-superficie'}`}
          >
            <IconeVeredito situacao={e.veredito} tamanho={15} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 text-[12px]">
                <span className="text-texto-3">#{e.rodada_id}</span>
                <span>{e.rodada?.ambiente ?? ''}</span>
                <span className="ml-auto text-[10px] text-texto-3">{dataCurta(e.executada_em)}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-texto-3">
                {e.resposta ? `HTTP ${e.resposta.status} · ${tempo(e.resposta.tempo_ms)}` : (e.erro ?? 'sem resposta')}
                {e.veredito !== e.veredito_auto && <span className="text-pendente">manual</span>}
              </div>
              {e.nota && <div className="mt-1 line-clamp-2 text-[11px] text-texto-2">{e.nota}</div>}
            </div>
            {e.rodada && <Avatar nome={e.rodada.autor} tamanho={18} />}
          </button>
        ))}
      </div>
    </aside>
  )
}
