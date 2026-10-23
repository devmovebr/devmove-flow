import { Check, Circle, Loader2, X } from 'lucide-react'
import { TextoAssercao } from '../../ui/TextoAssercao'
import { useState } from 'react'
import type { EnvioResultado } from '../../../shared/tipos'
import { Abas } from '../../ui/Abas'
import { Metodo } from '../../ui/Metodo'
import { tamanho, tempo } from '../../util/formato'
import { JsonArvore } from './JsonArvore'

type Props = { resultado: EnvioResultado | null; origem: string; carregando: boolean }
type Aba = 'corpo' | 'headers' | 'assercoes' | 'requisicao'

function corStatus(status: number): string {
  if (status < 300) return 'var(--color-passou)'
  if (status < 500) return 'var(--color-pendente)'
  return 'var(--color-falhou)'
}

function Metrica({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <span className="text-[11px] text-texto-3">
      {rotulo} <span className="font-medium" style={{ color: cor ?? 'var(--color-texto)' }}>{valor}</span>
    </span>
  )
}

function Headers({ pares }: { pares: [string, string][] }) {
  return (
    <div className="font-mono text-[12px]">
      {pares.map(([k, v], i) => (
        <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 border-b border-borda px-3 py-1.5">
          <span className="truncate text-texto-2">{k}</span>
          <span className="break-all text-texto">{v}</span>
        </div>
      ))}
    </div>
  )
}

export function PainelResposta({ resultado, origem, carregando }: Props) {
  const [aba, setAba] = useState<Aba>('corpo')
  const resposta = resultado?.resposta
  const assercoes = resultado?.assercoes ?? []
  const auto = assercoes.filter((a) => a.tipo === 'auto')
  const okAuto = auto.filter((a) => a.ok).length

  return (
    <div className="rounded-xl border border-borda bg-superficie">
      <div className="flex h-11 items-center gap-4 border-b border-borda px-3">
        <span className="text-[12px] font-medium">Resposta</span>
        {carregando && <Loader2 size={13} className="animate-spin text-acento-forte" />}
        {resposta && (
          <>
            <Metrica rotulo="Status" valor={String(resposta.status)} cor={corStatus(resposta.status)} />
            <Metrica rotulo="Tempo" valor={tempo(resposta.tempo_ms)} />
            <Metrica rotulo="Tamanho" valor={tamanho(resposta.tamanho)} />
          </>
        )}
        {resultado && auto.length > 0 && (
          <Metrica rotulo="Asserções" valor={`${okAuto}/${auto.length}`} cor={okAuto === auto.length ? 'var(--color-passou)' : 'var(--color-falhou)'} />
        )}
        <span className="ml-auto text-[11px] text-texto-3">{origem}</span>
      </div>

      {!resultado && !carregando && <p className="px-3 py-10 text-center text-texto-3">Envie a requisição ou escolha uma execução no histórico.</p>}
      {resultado?.erro && <p className="mx-3 mt-3 rounded-md bg-falhou/10 px-3 py-2 font-mono text-[12px] text-falhou">{resultado.erro}</p>}

      {resultado && (
        <>
          <div className="px-2.5 py-1.5">
            <Abas
              valor={aba}
              aoMudar={setAba}
              opcoes={[
                { valor: 'corpo', rotulo: 'Corpo' },
                { valor: 'headers', rotulo: 'Headers', contagem: resposta?.headers.length ?? 0 },
                { valor: 'assercoes', rotulo: 'Asserções', contagem: assercoes.length },
                { valor: 'requisicao', rotulo: 'Requisição enviada' },
              ]}
            />
          </div>
          <div className="max-h-[460px] overflow-auto border-t border-borda">
            {aba === 'corpo' && (
              <div className="p-3">{resposta ? <JsonArvore texto={resposta.body} /> : <span className="text-texto-3">Sem resposta</span>}</div>
            )}
            {aba === 'headers' && <Headers pares={resposta?.headers ?? []} />}
            {aba === 'assercoes' && (
              <ul className="flex flex-col">
                {assercoes.map((a, i) => (
                  <li key={i} className="flex items-start gap-2.5 border-b border-borda px-3 py-2">
                    {a.ok === true && <Check size={14} className="mt-0.5 shrink-0 text-passou" />}
                    {a.ok === false && <X size={14} className="mt-0.5 shrink-0 text-falhou" />}
                    {a.ok === null && <Circle size={12} className="mt-1 shrink-0 text-texto-3" />}
                    <div className="min-w-0">
                      <div className="text-[12px]"><TextoAssercao texto={a.texto} /></div>
                      <div className="text-[11px] text-texto-3">
                        {a.tipo === 'manual' ? 'Conferência manual' : a.obtido !== undefined ? `Obtido: ${JSON.stringify(a.obtido)}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
                {!assercoes.length && <li className="px-3 py-4 text-texto-3">Sem asserções.</li>}
              </ul>
            )}
            {aba === 'requisicao' && (
              <div>
                <div className="flex items-center gap-2 border-b border-borda px-3 py-2 font-mono text-[12px]">
                  <Metodo metodo={resultado.request.method} />
                  <span className="break-all">{resultado.request.url}</span>
                </div>
                <Headers pares={resultado.request.headers} />
                {resultado.request.body && <pre className="p-3 font-mono text-[12px] break-words whitespace-pre-wrap text-texto-2">{resultado.request.body}</pre>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
