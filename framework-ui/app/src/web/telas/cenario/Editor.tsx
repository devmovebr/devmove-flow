import { Plus, RotateCcw, Send, Trash2 } from 'lucide-react'
import { TextoAssercao } from '../../ui/TextoAssercao'
import { useState } from 'react'
import type { Requisicao } from '../../../shared/tipos'
import { Abas } from '../../ui/Abas'
import { Botao } from '../../ui/Botao'
import { corMetodo, metodos } from '../../util/metodo'
import { CampoVariavel } from './CampoVariavel'

type Pares = [string, string][]

function TabelaPares({ pares, aoMudar, conhecidas, rotuloNovo }: { pares: Pares; aoMudar: (p: Pares) => void; conhecidas?: Set<string>; rotuloNovo: string }) {
  const trocar = (i: number, j: 0 | 1, v: string) => aoMudar(pares.map((par, k) => (k === i ? (j === 0 ? [v, par[1]] : [par[0], v]) : par)))
  return (
    <div className="flex flex-col">
      {pares.map(([k, v], i) => (
        <div key={i} className="group grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_28px] items-center border-b border-borda">
          <CampoVariavel valor={k} aoMudar={(x) => trocar(i, 0, x)} placeholder="Nome" className="border-r border-borda" />
          <CampoVariavel valor={v} aoMudar={(x) => trocar(i, 1, x)} conhecidas={conhecidas} placeholder="Valor" />
          <button
            type="button"
            onClick={() => aoMudar(pares.filter((_, k2) => k2 !== i))}
            className="flex cursor-pointer justify-center text-texto-3 opacity-0 group-hover:opacity-100 hover:text-falhou"
            aria-label="Remover"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => aoMudar([...pares, ['', '']])} className="flex h-8 cursor-pointer items-center gap-1.5 px-2.5 text-[11px] text-texto-3 hover:text-texto">
        <Plus size={12} /> {rotuloNovo}
      </button>
    </div>
  )
}

type Props = {
  rascunho: Requisicao
  aoMudar: (r: Requisicao) => void
  env: Pares
  aoMudarEnv: (e: Pares) => void
  conhecidas?: Set<string>
  assercoes: string[]
  alterado: boolean
  aoRestaurar: () => void
  aoEnviar: () => void
  enviando: boolean
}

type Aba = 'headers' | 'corpo' | 'variaveis' | 'esperado'

export function Editor({ rascunho, aoMudar, env, aoMudarEnv, conhecidas, assercoes, alterado, aoRestaurar, aoEnviar, enviando }: Props) {
  const [aba, setAba] = useState<Aba>(rascunho.body ? 'corpo' : 'headers')

  return (
    <div className="rounded-xl border border-borda bg-superficie">
      <div className="flex items-center gap-2 p-2">
        <div className="flex min-w-0 flex-1 items-center rounded-lg border border-borda-forte bg-painel focus-within:border-acento/60">
          <select
            aria-label="Método"
            value={rascunho.method}
            onChange={(e) => aoMudar({ ...rascunho, method: e.target.value })}
            className="h-8 cursor-pointer border-r border-borda bg-transparent pr-1 pl-2.5 font-mono text-[12px] font-semibold outline-none"
            style={{ color: corMetodo(rascunho.method) }}
          >
            {metodos.map((m) => (
              <option key={m} value={m} className="bg-superficie text-texto">
                {m}
              </option>
            ))}
          </select>
          <CampoVariavel valor={rascunho.url} aoMudar={(url) => aoMudar({ ...rascunho, url })} conhecidas={conhecidas} placeholder="{{BASE}}/v1/..." className="flex-1" />
        </div>
        <Botao variante="secundario" onClick={aoEnviar} disabled={enviando || !rascunho.url} title="Envia sem gravar rodada">
          <Send size={12} />
          {enviando ? 'Enviando' : 'Enviar'}
        </Botao>
      </div>

      <div className="flex items-center justify-between border-y border-borda px-2.5 py-1.5">
        <Abas
          valor={aba}
          aoMudar={setAba}
          opcoes={[
            { valor: 'headers', rotulo: 'Headers', contagem: rascunho.headers.length },
            { valor: 'corpo', rotulo: 'Corpo' },
            { valor: 'variaveis', rotulo: 'Variáveis', contagem: env.length },
            { valor: 'esperado', rotulo: 'Esperado', contagem: assercoes.length },
          ]}
        />
        {alterado && (
          <button type="button" onClick={aoRestaurar} className="flex cursor-pointer items-center gap-1 text-[11px] text-texto-3 hover:text-texto">
            <RotateCcw size={11} /> Restaurar do plano
          </button>
        )}
      </div>

      <div className="min-h-[180px]">
        {aba === 'headers' && <TabelaPares pares={rascunho.headers} aoMudar={(headers) => aoMudar({ ...rascunho, headers })} conhecidas={conhecidas} rotuloNovo="Adicionar header" />}
        {aba === 'corpo' && (
          <CampoVariavel multilinha linhas={9} valor={rascunho.body} aoMudar={(body) => aoMudar({ ...rascunho, body })} conhecidas={conhecidas} placeholder="Sem corpo" className="p-1" />
        )}
        {aba === 'variaveis' && (
          <>
            <p className="px-2.5 pt-2 pb-1 text-[11px] text-texto-3">Valem só para este envio. BASE, TOKEN e segredos vêm do ambiente, no servidor.</p>
            <TabelaPares pares={env} aoMudar={aoMudarEnv} rotuloNovo="Adicionar variável" />
          </>
        )}
        {aba === 'esperado' && (
          <ul className="flex flex-col gap-1.5 px-3 py-3 text-[12px] text-texto-2">
            {assercoes.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-texto-3">-</span>
                <TextoAssercao texto={a} />
              </li>
            ))}
            {!assercoes.length && <li className="text-texto-3">Sem asserções no plano.</li>}
          </ul>
        )}
      </div>
    </div>
  )
}
