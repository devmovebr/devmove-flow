import { Columns2, GitCompareArrows, ListTree, MoreVertical, Play, SquareArrowOutUpRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useDemanda, useRodada } from '../../api/consultas'
import { useEventosRodada } from '../../api/eventos'
import { Topo } from '../../shell/Topo'
import { Abas } from '../../ui/Abas'
import { Botao, BotaoIcone } from '../../ui/Botao'
import { Carregando, Erro } from '../../ui/Estado'
import { classeBotao } from '../../util/botao'
import { caminhos, useRota } from '../../util/caminhos'
import { slugCurto } from '../../util/formato'
import { Arvore } from './Arvore'
import { ListaCenarios } from './ListaCenarios'
import { ListaRodadas } from './ListaRodadas'
import { ModalExecutar } from './ModalExecutar'

export function Suite() {
  const { p, d, slug } = useRota()
  const [busca, setBusca] = useSearchParams()
  const [executando, setExecutando] = useState(false)
  const { data, isPending, error } = useDemanda(p, d)

  const visao = busca.get('visao') === 'arvore' ? 'arvore' : 'rodadas'
  const idBusca = Number(busca.get('rodada')) || null
  const emCurso = data?.rodadas.find((r) => r.status === 'executando')?.id ?? null
  const estados = data?.estados ?? []
  const estado = idBusca || emCurso ? null : (estados.find((e) => e.ambiente === busca.get('estado')) ?? estados[0] ?? null)
  const rodadaId = estado ? null : (idBusca ?? emCurso ?? data?.rodadas[0]?.id ?? null)
  const rodada = useRodada(p, rodadaId)
  useEventosRodada(p, rodadaId, rodada.data?.status === 'executando')

  const mudar = (chave: string, valor: string | null) => {
    const nova = new URLSearchParams(busca)
    if (valor === null) nova.delete(chave)
    else nova.set(chave, valor)
    setBusca(nova, { replace: true })
  }

  const escolher = (chave: 'rodada' | 'estado', valor: string) => {
    const nova = new URLSearchParams(busca)
    nova.delete('rodada')
    nova.delete('estado')
    nova.set(chave, valor)
    setBusca(nova, { replace: true })
  }

  return (
    <>
      <Topo migalhas={[{ rotulo: data?.demanda.titulo ?? slugCurto(slug) }]}>
        <BotaoIcone ativo={visao === 'rodadas'} onClick={() => mudar('visao', null)} title="Rodadas e cenários">
          <Columns2 size={15} />
        </BotaoIcone>
        <BotaoIcone ativo={visao === 'arvore'} onClick={() => mudar('visao', 'arvore')} title="Árvore de demandas">
          <ListTree size={15} />
        </BotaoIcone>
        <span className="mx-1.5 h-5 w-px bg-borda" />
        <Link to={caminhos.comparar(p, d)} className={classeBotao()}>
          <GitCompareArrows size={13} />
          Comparar rodadas
        </Link>
        <Botao variante="primario" onClick={() => setExecutando(true)} disabled={!data}>
          <Play size={12} fill="currentColor" />
          Executar suíte
        </Botao>
      </Topo>

      {executando && <ModalExecutar aoFechar={() => setExecutando(false)} />}

      {isPending && <Carregando />}
      {error && <Erro erro={error} />}
      {data && (
        <div className="flex min-h-0 flex-1 border-t border-borda">
          <section className="flex w-[360px] shrink-0 flex-col">
            <div className="flex h-11 items-center justify-between px-4">
              <Abas
                valor={visao}
                aoMudar={(v) => mudar('visao', v === 'arvore' ? 'arvore' : null)}
                opcoes={[
                  { valor: 'arvore', rotulo: 'Demandas' },
                  { valor: 'rodadas', rotulo: 'Rodadas', contagem: data.rodadas.length },
                ]}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              {visao === 'arvore' ? (
                <Arvore />
              ) : (
                <ListaRodadas
                  rodadas={data.rodadas}
                  estados={estados}
                  ativa={rodadaId}
                  estadoAtivo={estado?.ambiente ?? null}
                  aoEscolher={(id) => escolher('rodada', String(id))}
                  aoEscolherEstado={(amb) => escolher('estado', amb)}
                />
              )}
            </div>
          </section>

          <div className="relative w-px bg-borda">
            <span className="absolute top-1/2 left-1/2 flex h-6 w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm bg-painel text-texto-3">
              <MoreVertical size={10} />
            </span>
          </div>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
              <div className="min-w-0">
                <h2 className="truncate text-[16px] font-medium">{data.suite.titulo || data.demanda.titulo}</h2>
                <p className="mt-0.5 text-[11px] text-texto-3">
                  {data.suite.cenarios.length} cenários
                  {estado && ` · estado atual em ${estado.ambiente}, última execução de cada cenário`}
                  {!estado && rodada.data && ` · rodada #${rodada.data.id} em ${rodada.data.ambiente} por ${rodada.data.autor}`}
                </p>
              </div>
              {!estado && rodada.data && (
                <Link to={caminhos.rodada(p, d, rodada.data.id)} className={classeBotao('fantasma')}>
                  <SquareArrowOutUpRight size={13} />
                  Abrir rodada
                </Link>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-borda">
              {rodada.error && <Erro erro={rodada.error} />}
              <ListaCenarios
                cenarios={data.suite.cenarios}
                execucoes={estado ? estado.execucoes : (rodada.data?.execucoes ?? [])}
                rodada={estado ? null : (rodada.data ?? null)}
              />
            </div>
          </section>
        </div>
      )}
    </>
  )
}
