import { Bug, Check, FileCode2, Square, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { Cenario, Execucao, Placar } from '../../shared/tipos'
import { useDemanda, useParar, useRodada } from '../api/consultas'
import { useEventosRodada } from '../api/eventos'
import { Topo } from '../shell/Topo'
import { BadgeVeredito } from '../ui/BadgeVeredito'
import { Botao } from '../ui/Botao'
import { Contadores } from '../ui/Contadores'
import { Carregando, Erro, Vazio } from '../ui/Estado'
import { Metodo } from '../ui/Metodo'
import { TextoAssercao } from '../ui/TextoAssercao'
import { caminhos, useRota } from '../util/caminhos'
import { caminhoUrl, dataCompleta, slugCurto, tempo } from '../util/formato'
import { cor, statusRodada, type Situacao } from '../util/veredito'

type Item = { cenario: Cenario; execucao?: Execucao; situacao: Situacao | 'EXECUTANDO' }

function placarLocal(itens: Item[]): Placar {
  const conta = (s: string) => itens.filter((i) => i.situacao === s).length
  return {
    passou: conta('PASSOU'),
    falhou: conta('FALHOU'),
    pendente: conta('PENDENTE'),
    bloqueado: conta('BLOQUEADO'),
    nao_executado: itens.length - itens.filter((i) => i.execucao).length,
    total: itens.length,
  }
}

function Esperado({ item }: { item: Item }) {
  if (item.execucao) {
    return (
      <ul className="flex flex-col gap-1">
        {item.execucao.assercoes.map((a, i) => (
          <li key={i} className="flex items-start gap-1.5">
            {a.ok === true && <Check size={12} className="mt-[3px] shrink-0 text-passou" />}
            {a.ok === false && <X size={12} className="mt-[3px] shrink-0 text-falhou" />}
            {a.ok === null && <span className="mt-[7px] size-1 shrink-0 rounded-full bg-texto-3" />}
            <span className="break-words">
              <TextoAssercao texto={a.texto} />
              {a.ok === false && a.obtido !== undefined && <span className="text-falhou"> (obtido {JSON.stringify(a.obtido)})</span>}
            </span>
          </li>
        ))}
        {item.execucao.erro && <li className="text-falhou">{item.execucao.erro}</li>}
      </ul>
    )
  }
  return (
    <ul className="flex flex-col gap-1">
      {item.cenario.assercoes.map((a, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className="mt-[7px] size-1 shrink-0 rounded-full bg-texto-3" />
          <TextoAssercao texto={a} />
        </li>
      ))}
    </ul>
  )
}

function Card({ item, aoAbrir }: { item: Item; aoAbrir: () => void }) {
  const { cenario, execucao, situacao } = item
  const c = situacao === 'EXECUTANDO' ? 'var(--color-acento)' : cor[situacao]
  const tinta = situacao === 'NAO_EXECUTADO' ? 'transparent' : `color-mix(in srgb, ${c} 9%, transparent)`
  const req = execucao?.request ?? cenario.request

  return (
    <div className="relative">
      <div
        role="link"
        tabIndex={0}
        onClick={aoAbrir}
        onKeyDown={(e) => e.key === 'Enter' && aoAbrir()}
        className="grid w-full cursor-pointer grid-cols-[56px_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.35fr)_118px] items-start gap-4 rounded-xl border border-borda px-4 py-4 text-left text-[12px] leading-[1.55] text-texto-2 transition-colors hover:border-borda-forte"
        style={{ background: `linear-gradient(100deg, ${tinta}, var(--color-superficie) 70%)` }}
      >
        <span className="pl-2 text-[24px] leading-none font-light text-texto">{cenario.id.replace(/^T/, '')}</span>
        <div className="min-w-0">
          <div className="text-[13px] text-texto">{cenario.titulo}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <Metodo metodo={req.method} />
            <span className="truncate font-mono text-[11px]">{caminhoUrl(req.url)}</span>
          </div>
          {execucao?.resposta && (
            <div className="mt-1 text-[11px] text-texto-3">
              HTTP {execucao.resposta.status} · {tempo(execucao.resposta.tempo_ms)}
            </div>
          )}
        </div>
        <div>{cenario.precondicao ?? <span className="text-texto-3">Sem pré-condição</span>}</div>
        <Esperado item={item} />
        <div className="flex justify-end">
          <BadgeVeredito situacao={situacao} />
        </div>
      </div>
      {situacao === 'FALHOU' && (
        <div className="absolute top-4 -right-[52px] flex items-center">
          <span className="h-px w-3 bg-falhou/60" />
          <span className="flex size-8 items-center justify-center rounded-full bg-falhou/12 text-falhou" title="Falhou">
            <Bug size={15} />
          </span>
        </div>
      )}
    </div>
  )
}

export function Rodada() {
  const { p, d, slug, id } = useRota()
  const navegar = useNavigate()
  const rodada = useRodada(p, id)
  const demanda = useDemanda(p, d)
  const parar = useParar(p, id ?? 0)
  const ativa = rodada.data?.status === 'executando'
  useEventosRodada(p, id, ativa)

  const migalhas = [{ rotulo: demanda.data?.demanda.titulo ?? slugCurto(slug), para: caminhos.suite(p, d) }, { rotulo: `Rodada #${id}` }]
  if (rodada.isPending || demanda.isPending) return (<><Topo migalhas={migalhas} /><Carregando /></>)
  const erro = rodada.error ?? demanda.error
  if (erro || !rodada.data || !demanda.data) return (<><Topo migalhas={migalhas} /><Erro erro={erro} /></>)

  const r = rodada.data
  const porCenario = new Map(r.execucoes.map((e) => [e.cenario, e]))
  const cenarios = demanda.data.suite.cenarios
  const proximo = ativa ? cenarios.findIndex((x) => !porCenario.has(x.id)) : -1
  const itens: Item[] = cenarios.map((cenario, i) => {
    const execucao = porCenario.get(cenario.id)
    const situacao: Item['situacao'] = execucao?.veredito ?? (i === proximo ? 'EXECUTANDO' : 'NAO_EXECUTADO')
    return { cenario, execucao, situacao }
  })

  return (
    <>
      <Topo migalhas={migalhas} />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
        <div className="mr-[60px] max-w-[1100px] rounded-2xl border border-borda bg-[radial-gradient(ellipse_at_top_left,color-mix(in_srgb,var(--color-acento)_9%,transparent),transparent_55%)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.06em] uppercase">
                <span className="flex size-6 items-center justify-center rounded-md border border-borda-forte text-texto-2">
                  <FileCode2 size={12} />
                </span>
                <span className="text-texto-3">#{r.id}</span>
                <span className="text-texto-3">·</span>
                <span className={ativa ? 'animate-pulse text-acento-forte' : r.status === 'interrompida' ? 'text-pendente' : 'text-texto-2'}>
                  {statusRodada[r.status]}
                </span>
              </div>
              <h2 className="mt-2 text-[17px] font-medium">{demanda.data.suite.titulo || demanda.data.demanda.titulo}</h2>
              <p className="mt-0.5 text-[11px] text-texto-3">
                Iniciada {dataCompleta(r.iniciada_em)} por {r.autor} · {r.ambiente} · {r.origem}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Contadores placar={placarLocal(itens)} />
              {ativa && (
                <Botao variante="perigo" onClick={() => parar.mutate()} disabled={parar.isPending}>
                  <Square size={10} fill="currentColor" />
                  {parar.isPending ? 'Parando' : 'Parar execução'}
                </Botao>
              )}
            </div>
          </div>
          {parar.error && <Erro erro={parar.error} />}

          <div className="mt-5 grid grid-cols-[56px_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.35fr)_118px] gap-4 px-4 pb-2 text-[11.5px] text-texto-2">
            <span />
            <span>Chamada</span>
            <span>Pré-condição</span>
            <span>Esperado</span>
            <span className="text-right">Resultado</span>
          </div>
          <div className="flex flex-col gap-2">
            {!itens.length && <Vazio texto="A suíte não tem cenários." />}
            {itens.map((item) => (
              <Card key={item.cenario.id} item={item} aoAbrir={() => navegar(caminhos.cenario(p, d, item.cenario.id))} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
