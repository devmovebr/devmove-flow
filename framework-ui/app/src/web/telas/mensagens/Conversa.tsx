import { useEffect, useMemo, useRef, useState } from 'react'
import { useConversa } from '../../api/consultas'
import { Topo } from '../../shell/Topo'
import { Abas } from '../../ui/Abas'
import { Carregando, Erro, Vazio } from '../../ui/Estado'
import { useRota } from '../../util/caminhos'
import { hora, slugCurto } from '../../util/formato'
import { humanizar } from '../../util/mensagens'
import { CartaoMensagem, type Vinculo } from './CartaoMensagem'
import { SeloAguardando } from './Conversas'

type Filtro = 'todas' | 'perguntas' | 'aguardando'

export function Conversa() {
  const { p, d, slug } = useRota()
  const { data, isPending, error, dataUpdatedAt } = useConversa(p, d)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const rolagem = useRef<HTMLDivElement>(null)
  const noFim = useRef(true)

  // Resposta com pergunta conhecida sai da timeline e vai para baixo dela; resposta órfã fica no lugar.
  const itens = useMemo(() => {
    const lista = (data?.mensagens ?? []).map((mensagem, indice): Vinculo => ({ indice, mensagem, visao: humanizar(mensagem) }))
    const perguntas = new Set(lista.filter((v) => v.mensagem.tipo === 'question.created').map((v) => v.visao.questionId))
    const respostas = new Map<string, Vinculo>()
    for (const v of lista) {
      const id = v.visao.questionId
      if (v.mensagem.tipo === 'answer.accepted' && id && perguntas.has(id) && !respostas.has(id)) respostas.set(id, v)
    }
    const aninhadas = new Set(respostas.values())
    return lista
      .filter((v) => !aninhadas.has(v))
      .map((v) => ({ ...v, resposta: v.mensagem.tipo === 'question.created' ? (respostas.get(v.visao.questionId ?? '') ?? null) : null }))
  }, [data])

  const total = data?.mensagens.length ?? 0
  // Mensagem nova rola a timeline só para quem já estava no fim; quem subiu para ler não perde o lugar.
  useEffect(() => {
    const el = rolagem.current
    if (el && noFim.current) el.scrollTop = el.scrollHeight
  }, [total])

  const perguntas = itens.filter((i) => i.mensagem.tipo === 'question.created')
  const aguardando = perguntas.filter((i) => !i.resposta)
  const visiveis = filtro === 'perguntas' ? perguntas : filtro === 'aguardando' ? aguardando : itens

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
                { valor: 'todas', rotulo: 'Todas', contagem: total },
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
                  <CartaoMensagem key={`${i.indice}-${i.mensagem.registrada_em}`} {...i} ultimo={n === visiveis.length - 1} />
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  )
}
