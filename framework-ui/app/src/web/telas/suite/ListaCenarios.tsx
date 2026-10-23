import { Bug, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { Cenario, Execucao, Rodada } from '../../../shared/tipos'
import { Avatar } from '../../ui/Avatar'
import { IconeVeredito } from '../../ui/IconeVeredito'
import { Metodo } from '../../ui/Metodo'
import { caminhos, useRota } from '../../util/caminhos'
import { caminhoUrl, dataCurta, tempo } from '../../util/formato'

type Props = { cenarios: Cenario[]; execucoes: Execucao[]; rodada: Rodada | null }

function LinhaCenario({ cenario, execucao, rodada, executando }: { cenario: Cenario; execucao?: Execucao; rodada: Rodada | null; executando: boolean }) {
  const { p, d } = useRota()
  const autor = (execucao?.rodada ?? rodada)?.autor

  return (
    <Link
      to={caminhos.cenario(p, d, cenario.id)}
      className="group grid grid-cols-[18px_minmax(0,1fr)_64px_44px_24px_14px] items-center gap-3 border-b border-borda px-5 py-2.5 hover:bg-superficie"
    >
      <IconeVeredito situacao={execucao ? execucao.veredito : executando ? 'EXECUTANDO' : 'NAO_EXECUTADO'} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 truncate">
          <span className="text-[11px] text-texto-3">#{cenario.id}</span>
          <span className="truncate text-[13px]">{cenario.titulo}</span>
          {cenario.erros.length > 0 && <span className="text-[10px] text-falhou">erro no plano</span>}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-texto-3">
          <Metodo metodo={cenario.request.method} />
          <span className="truncate font-mono">{caminhoUrl(cenario.request.url)}</span>
          {execucao && autor && (
            <span className="truncate">
              · Executado em {dataCurta(execucao.executada_em)} por {autor}
              {!rodada && execucao.rodada && ` na rodada #${execucao.rodada.id}`}
            </span>
          )}
        </div>
      </div>
      <span className="text-right text-[11px] text-texto-2 tabular-nums">
        {execucao?.resposta ? tempo(execucao.resposta.tempo_ms) : ''}
      </span>
      <span className="text-right font-mono text-[11px] text-texto-3">
        {execucao?.veredito === 'FALHOU' ? <Bug size={13} className="ml-auto text-falhou" /> : (execucao?.resposta?.status ?? '')}
      </span>
      {execucao && autor ? <Avatar nome={autor} /> : <span />}
      <ChevronRight size={14} className="text-texto-3 opacity-0 group-hover:opacity-100" />
    </Link>
  )
}

export function ListaCenarios({ cenarios, execucoes, rodada }: Props) {
  const porCenario = new Map(execucoes.map((e) => [e.cenario, e]))
  const proximo = rodada?.status === 'executando' ? cenarios.findIndex((c) => !porCenario.has(c.id)) : -1
  return (
    <div>
      {cenarios.map((c, i) => (
        <LinhaCenario key={c.id} cenario={c} execucao={porCenario.get(c.id)} rodada={rodada} executando={i === proximo} />
      ))}
    </div>
  )
}
