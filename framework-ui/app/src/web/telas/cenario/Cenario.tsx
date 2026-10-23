import { AlertTriangle, ChevronDown, Play, Server } from 'lucide-react'
import { useState } from 'react'
import type { Cenario as TipoCenario, EnvioResultado, Requisicao } from '../../../shared/tipos'
import { useAmbientes, useDemanda, useEnviar, useExecutar, useHistorico } from '../../api/consultas'
import { useEventosRodada } from '../../api/eventos'
import { Topo } from '../../shell/Topo'
import { Botao } from '../../ui/Botao'
import { Carregando, Erro, Vazio } from '../../ui/Estado'
import { caminhos, useRota } from '../../util/caminhos'
import { slugCurto } from '../../util/formato'
import { Editor } from './Editor'
import { Historico } from './Historico'
import { PainelResposta } from './PainelResposta'

type Selecao = { tipo: 'avulso'; dado: EnvioResultado; origem: string } | { tipo: 'execucao'; id: number } | { tipo: 'ultima' }

function doPlano(cenario: TipoCenario): Requisicao {
  const { method, url, headers, body } = cenario.request
  return { method, url, headers: headers.map(([k, v]) => [k, v]), body }
}

function SeletorAmbiente({ ambientes, valor, aoMudar }: { ambientes: string[]; valor: string; aoMudar: (v: string) => void }) {
  return (
    <label className="relative flex h-8 items-center gap-2 rounded-md border border-borda-forte bg-superficie-2 px-2.5 text-[12px] hover:bg-superficie-3">
      <Server size={12} className="text-texto-3" />
      {valor || 'Ambiente'}
      <ChevronDown size={12} className="text-texto-3" />
      <select aria-label="Ambiente" value={valor} onChange={(e) => aoMudar(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
        {ambientes.map((a) => (
          <option key={a}>{a}</option>
        ))}
      </select>
    </label>
  )
}

function TelaCenario({ cenario, titulo }: { cenario: TipoCenario; titulo: string }) {
  const { p, d } = useRota()
  const ambientes = useAmbientes(p)
  const historico = useHistorico(p, d, cenario.id)
  const enviar = useEnviar(p)
  const executar = useExecutar(p, d)

  const [rascunho, setRascunho] = useState(() => doPlano(cenario))
  const [env, setEnv] = useState<[string, string][]>(() => Object.entries(cenario.env))
  const [escolhido, setEscolhido] = useState('')
  const [selecao, setSelecao] = useState<Selecao>({ tipo: 'ultima' })
  const [rodadaAtiva, setRodadaAtiva] = useState<number | null>(null)

  const ambiente = escolhido || historico.data?.[0]?.rodada?.ambiente || ambientes.data?.[0] || ''
  const alterado = JSON.stringify(rascunho) !== JSON.stringify(doPlano(cenario)) || JSON.stringify(env) !== JSON.stringify(Object.entries(cenario.env))

  useEventosRodada(p, rodadaAtiva, rodadaAtiva !== null, {
    aoExecutar: (e) => e.cenario === cenario.id && setSelecao({ tipo: 'avulso', dado: e, origem: `Rodada #${e.rodada_id}` }),
    aoTerminar: () => {
      setRodadaAtiva(null)
      setSelecao({ tipo: 'ultima' })
    },
  })

  const aoEnviar = () =>
    enviar.mutate(
      { ambiente, dossie: d, cenario: cenario.id, request: rascunho, env: Object.fromEntries(env.filter(([k]) => k.trim())) },
      { onSuccess: (dado) => setSelecao({ tipo: 'avulso', dado, origem: `Envio avulso em ${ambiente}, não gravado` }) },
    )

  const aoExecutar = () =>
    executar.mutate({ ambiente, cenarios: [cenario.id] }, { onSuccess: ({ rodada_id }) => setRodadaAtiva(rodada_id) })

  const execucoes = historico.data
  let resultado: EnvioResultado | null = null
  let origem = ''
  if (selecao.tipo === 'avulso') {
    resultado = selecao.dado
    origem = selecao.origem
  } else {
    const e = selecao.tipo === 'ultima' ? execucoes?.[0] : execucoes?.find((x) => x.id === selecao.id)
    if (e) {
      resultado = e
      origem = `Rodada #${e.rodada_id}${e.rodada ? ` em ${e.rodada.ambiente}` : ''}`
    }
  }
  const idSelecionado = selecao.tipo === 'execucao' ? selecao.id : selecao.tipo === 'ultima' ? (execucoes?.[0]?.id ?? null) : null

  return (
    <>
      <Topo migalhas={[{ rotulo: titulo, para: caminhos.suite(p, d) }, { rotulo: `${cenario.id} ${cenario.titulo}` }]}>
        <SeletorAmbiente ambientes={ambientes.data ?? []} valor={ambiente} aoMudar={setEscolhido} />
        <Botao
          variante="primario"
          onClick={aoExecutar}
          disabled={!ambiente || executar.isPending || rodadaAtiva !== null || cenario.erros.length > 0}
          title="Executa o cenário como está no plano-teste.md e grava uma rodada"
        >
          <Play size={12} fill="currentColor" />
          {rodadaAtiva !== null ? 'Executando' : 'Executar cenário'}
        </Botao>
      </Topo>

      <div className="flex min-h-0 flex-1 border-t border-borda">
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] text-texto-3">#{cenario.id}</span>
              <h2 className="text-[17px] font-medium">{cenario.titulo}</h2>
            </div>
            {cenario.precondicao && (
              <p className="mt-1 text-[12px] text-texto-2">
                <span className="text-texto-3">Pré-condição: </span>
                {cenario.precondicao}
              </p>
            )}
            {cenario.objetivo && (
              <p className="mt-0.5 text-[12px] text-texto-2">
                <span className="text-texto-3">Objetivo: </span>
                {cenario.objetivo}
              </p>
            )}
            {cenario.erros.map((e, i) => (
              <p key={i} className="mt-2 flex items-center gap-1.5 text-[12px] text-falhou">
                <AlertTriangle size={13} /> {e}
              </p>
            ))}
          </div>

          <Editor
            rascunho={rascunho}
            aoMudar={setRascunho}
            env={env}
            aoMudarEnv={setEnv}
            assercoes={cenario.assercoes}
            alterado={alterado}
            aoRestaurar={() => {
              setRascunho(doPlano(cenario))
              setEnv(Object.entries(cenario.env))
            }}
            aoEnviar={aoEnviar}
            enviando={enviar.isPending}
          />
          {(enviar.error || executar.error) && <Erro erro={enviar.error ?? executar.error} />}

          <div className="mt-4">
            <PainelResposta resultado={resultado} origem={origem} carregando={enviar.isPending || rodadaAtiva !== null} />
          </div>
        </div>

        <Historico
          execucoes={execucoes}
          carregando={historico.isPending}
          erro={historico.error}
          selecionada={idSelecionado}
          aoEscolher={(id) => setSelecao({ tipo: 'execucao', id })}
        />
      </div>
    </>
  )
}

export function Cenario() {
  const { p, d, c, slug } = useRota()
  const demanda = useDemanda(p, d)
  const titulo = demanda.data?.demanda.titulo ?? slugCurto(slug)
  const cenario = demanda.data?.suite.cenarios.find((x) => x.id === c)

  if (cenario) return <TelaCenario key={`${d}/${c}`} cenario={cenario} titulo={titulo} />
  return (
    <>
      <Topo migalhas={[{ rotulo: titulo, para: caminhos.suite(p, d) }, { rotulo: c }]} />
      {demanda.isPending && <Carregando />}
      {demanda.error && <Erro erro={demanda.error} />}
      {demanda.data && <Vazio texto={`Cenário ${c} não está no plano-teste.md.`} />}
    </>
  )
}
