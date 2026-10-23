import { ListFilter, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { useAmbientes, useDemanda, useMatriz } from '../api/consultas'
import { Topo } from '../shell/Topo'
import { Avatar } from '../ui/Avatar'
import { Donut } from '../ui/Donut'
import { Carregando, Erro, Vazio } from '../ui/Estado'
import { IconeVeredito } from '../ui/IconeVeredito'
import { caminhos, useRota } from '../util/caminhos'
import { dataCurta, slugCurto } from '../util/formato'
import { percentual, rotulo } from '../util/veredito'

function FiltroAmbiente({ valor, aoMudar }: { valor: string; aoMudar: (v: string) => void }) {
  const { p } = useRota()
  const { data: ambientes = [] } = useAmbientes(p)
  return (
    <div className="mx-6 mb-3 flex h-10 items-center gap-3 rounded-lg border border-borda bg-superficie px-3 text-[12px]">
      <ListFilter size={14} className="text-texto-3" />
      <span className="font-medium">Ambiente</span>
      <span className="text-texto-3">é</span>
      <div className="flex items-center gap-1">
        {['', ...ambientes].map((a) => (
          <button
            key={a || 'todos'}
            type="button"
            onClick={() => aoMudar(a)}
            className={`h-6 cursor-pointer rounded-md px-2 text-[11px] ${
              a === valor ? 'bg-acento-suave text-acento-forte' : 'text-texto-2 hover:bg-superficie-2'
            }`}
          >
            {a || 'qualquer um'}
          </button>
        ))}
      </div>
      {valor && (
        <button type="button" onClick={() => aoMudar('')} className="ml-auto cursor-pointer text-texto-3 hover:text-texto" aria-label="Limpar filtro">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export function Comparar() {
  const { p, d, slug } = useRota()
  const [busca, setBusca] = useSearchParams()
  const ambiente = busca.get('ambiente') ?? ''
  const demanda = useDemanda(p, d)
  const { data, isPending, error } = useMatriz(p, d, ambiente)

  const titulo = demanda.data?.demanda.titulo ?? slugCurto(slug)
  const rodadas = data?.rodadas ?? []
  const colunas = `minmax(280px,440px) repeat(${rodadas.length}, 88px) 1fr`

  return (
    <>
      <Topo migalhas={[{ rotulo: titulo, para: caminhos.suite(p, d) }, { rotulo: 'Comparar rodadas' }]} />
      <FiltroAmbiente valor={ambiente} aoMudar={(a) => setBusca(a ? { ambiente: a } : {}, { replace: true })} />

      {isPending && <Carregando />}
      {error && <Erro erro={error} />}
      {data && !rodadas.length && <Vazio texto="Nenhuma rodada para comparar." />}
      {data && rodadas.length > 0 && (
        <div className="min-h-0 flex-1 overflow-auto border-t border-borda">
          <div className="min-w-max">
            <div className="sticky top-0 z-10 grid border-b border-borda bg-painel" style={{ gridTemplateColumns: colunas }}>
              <div className="sticky left-0 bg-painel px-6 py-2.5 text-[11px] text-texto-3">Cenário</div>
              {rodadas.map((r) => (
                <Link key={r.id} to={caminhos.rodada(p, d, r.id)} className="flex flex-col items-center gap-1 px-1 py-2 hover:bg-superficie">
                  <span className="text-[12px] font-medium">#{r.id}</span>
                  <span className="text-[10px] text-texto-2">{r.ambiente}</span>
                  <span className="text-[10px] text-texto-3">{dataCurta(r.iniciada_em)}</span>
                  <Avatar nome={r.autor} tamanho={18} />
                </Link>
              ))}
              <span />
            </div>

            {data.linhas.map((linha) => {
              const valores = rodadas.map((r) => linha.vereditos[r.id]).filter(Boolean)
              const variou = new Set(valores).size > 1
              return (
                <div key={linha.cenario} className="grid border-b border-borda hover:bg-superficie/60" style={{ gridTemplateColumns: colunas }}>
                  <Link to={caminhos.cenario(p, d, linha.cenario)} className="sticky left-0 flex min-w-0 items-center gap-2 bg-painel px-6 py-3">
                    <span className="text-[11px] text-texto-3">#{linha.cenario}</span>
                    <span className="truncate text-[13px] hover:underline">{linha.titulo}</span>
                    {variou && <span className="size-1.5 shrink-0 rounded-full bg-acento-forte" title="Resultado mudou entre rodadas" />}
                  </Link>
                  {rodadas.map((r) => {
                    const v = linha.vereditos[r.id]
                    return (
                      <Link
                        key={r.id}
                        to={caminhos.rodada(p, d, r.id)}
                        title={v ? rotulo[v] : rotulo.NAO_EXECUTADO}
                        className="flex items-center justify-center hover:bg-superficie-2"
                      >
                        <IconeVeredito situacao={v ?? 'NAO_EXECUTADO'} tamanho={17} />
                      </Link>
                    )
                  })}
                  <span />
                </div>
              )
            })}

            <div className="grid" style={{ gridTemplateColumns: colunas }}>
              <div className="sticky left-0 bg-painel px-6 py-3 text-[11px] text-texto-3">Passou</div>
              {rodadas.map((r) => (
                <div key={r.id} className="flex items-center justify-center py-2">
                  <Donut valor={percentual(r.placar)} tamanho={30} />
                </div>
              ))}
              <span />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
