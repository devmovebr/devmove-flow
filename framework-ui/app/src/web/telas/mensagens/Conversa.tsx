import { useEffect, useMemo, useRef, useState } from 'react'
import { useConversa } from '../../api/consultas'
import { Topo } from '../../shell/Topo'
import { Abas } from '../../ui/Abas'
import { Carregando, Erro, Vazio } from '../../ui/Estado'
import { useRota } from '../../util/caminhos'
import { slugCurto } from '../../util/formato'
import { hora, humanizar } from '../../util/mensagens'
import { CartaoMensagem, type Vinculo } from './CartaoMensagem'
import { SeloAguardando } from './Conversas'

type Filtro = 'todas' | 'perguntas' | 'aguardando'

export function Conversa() {
  const { p, d, slug } = useRota()
  const { data, isPending, error, dataUpdatedAt } = useConversa(p, d)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [destacado, setDestacado] = useState<number | null>(null)
  const rolagem = useRef<HTMLDivElement>(null)
  const noFim = useRef(true)

  const itens = useMemo(() => {
    const lista = (data?.mensagens ?? []).map((mensagem, indice): Vinculo => ({ indice, mensagem, visao: humanizar(mensagem) }))
    const perguntas = new Map<string, Vinculo>()
    const respostas = new Map<string, Vinculo>()
    for (const v of lista) {
      if (!v.visao.questionId) continue
      if (v.mensagem.tipo === 'question.created') perguntas.set(v.visao.questionId, v)
      if (v.mensagem.tipo === 'answer.accepted' && !respostas.has(v.visao.questionId)) respostas.set(v.visao.questionId, v)
    }
    return lista.map((v) => {
      const id = v.visao.questionId ?? ''
      return {
        ...v,
        pergunta: v.mensagem.tipo === 'answer.accepted' ? (perguntas.get(id) ?? null) : null,
        resposta: v.mensagem.tipo === 'question.created' ? (respostas.get(id) ?? null) : null,
      }
    })
  }, [data])

  const total = itens.length
  // Mensagem nova rola a timeline só para quem já estava no fim; quem subiu para ler não perde o lugar.
  useEffect(() => {
    const el = rolagem.current
    if (el && noFim.current) el.scrollTop = el.scrollHeight
  }, [total])

  const perguntas = itens.filter((i) => i.mensagem.tipo === 'question.created')
  const aguardando = perguntas.filter((i) => !i.resposta)
  const visiveis = filtro === 'perguntas' ? perguntas : filtro === 'aguardando' ? aguardando : itens

  const irPara = (indice: number) => {
    setFiltro('todas')
    requestAnimationFrame(() => document.getElementById(`msg-${indice}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    setDestacado(indice)
    setTimeout(() => setDestacado((atual) => (atual === indice ? null : atual)), 1600)
  }

  return (
    <>
      <Topo migalhas={[{ rotulo: data?.titulo ?? slugCurto(slug) }]} />
      {isPending && <Carregando />}
      {error && <Erro erro={error} />}
      {data && (
        <div className="flex min-h-0 flex-1 flex-col border-t border-borda">
          <div className="flex items-start justify-between gap-4 px-6 pt-4 pb-3">
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-medium">
                {data.item && <span className="mr-2 text-acento-forte">{data.item}</span>}
                {data.titulo}
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-texto-3">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-passou opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-passou" />
                </span>
                ao vivo · {data.total} mensagens · #{data.tipo} · {slugCurto(data.slug)}
                {dataUpdatedAt > 0 && ` · lido às ${hora(new Date(dataUpdatedAt).toISOString())}`}
              </p>
            </div>
            <SeloAguardando n={data.aguardando} />
          </div>
          <div className="flex items-center border-b border-borda px-6 pb-3">
            <Abas
              valor={filtro}
              aoMudar={setFiltro}
              opcoes={[
                { valor: 'todas', rotulo: 'Todas', contagem: itens.length },
                { valor: 'perguntas', rotulo: 'Perguntas', contagem: perguntas.length },
                { valor: 'aguardando', rotulo: 'Aguardando resposta', contagem: aguardando.length },
              ]}
            />
          </div>
          <div
            ref={rolagem}
            onScroll={(e) => {
              const el = e.currentTarget
              noFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
            }}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            {!visiveis.length ? (
              <Vazio texto={filtro === 'todas' ? 'Arquivo sem mensagens ainda.' : 'Nada neste filtro.'} />
            ) : (
              <ol className="mx-auto max-w-[920px] px-6 pt-5 pb-8">
                {visiveis.map((i, n) => (
                  <CartaoMensagem
                    key={`${i.indice}-${i.mensagem.registrada_em}`}
                    mensagem={i.mensagem}
                    visao={i.visao}
                    indice={i.indice}
                    ultimo={n === visiveis.length - 1}
                    pergunta={i.pergunta}
                    resposta={i.resposta}
                    destacado={destacado === i.indice}
                    aoIr={irPara}
                  />
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  )
}
