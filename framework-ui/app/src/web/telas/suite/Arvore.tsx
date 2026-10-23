import { ChevronDown, ChevronRight, FileCode2, FileText, Folder, FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { Demanda } from '../../../shared/tipos'
import { useDemanda, useDemandas } from '../../api/consultas'
import { Carregando, Erro } from '../../ui/Estado'
import { caminhos, useRota } from '../../util/caminhos'

function Seta({ aberto }: { aberto: boolean }) {
  return aberto ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />
}

function NoDemanda({ demanda }: { demanda: Demanda }) {
  const { p, d, c } = useRota()
  const atual = demanda.dossie === d
  const [aberto, setAberto] = useState(atual)
  const detalhe = useDemanda(p, demanda.dossie, aberto)

  return (
    <li>
      <div className={`flex h-7 items-center gap-1.5 rounded-md pr-2 pl-5 ${atual ? 'text-texto' : 'text-texto-2'} hover:bg-superficie`}>
        <button type="button" onClick={() => setAberto(!aberto)} className="cursor-pointer text-texto-3" aria-label="Expandir">
          <Seta aberto={aberto} />
        </button>
        <FileText size={13} className={atual ? 'text-acento-forte' : 'text-texto-3'} />
        <Link to={caminhos.suite(p, demanda.dossie)} className={`min-w-0 flex-1 truncate text-[12px] ${atual ? 'font-medium' : ''}`}>
          {demanda.titulo}
        </Link>
        <span className="text-[10px] text-texto-3 tabular-nums">{demanda.total_cenarios}</span>
      </div>
      {aberto && (
        <ul className="ml-[38px] border-l border-borda">
          {detalhe.isPending && <li className="pl-3 text-[11px] text-texto-3">Carregando</li>}
          {detalhe.data?.suite.cenarios.map((cen) => {
            const ativo = atual && cen.id === c
            return (
              <li key={cen.id}>
                <Link
                  to={caminhos.cenario(p, demanda.dossie, cen.id)}
                  className={`ml-2 flex h-7 items-center gap-2 rounded-md px-2 text-[12px] ${
                    ativo ? 'border border-acento/50 bg-acento-suave text-texto' : 'text-texto-2 hover:bg-superficie hover:text-texto'
                  }`}
                >
                  <FileCode2 size={12} className="shrink-0 text-texto-3" />
                  <span className="text-[10px] text-texto-3">#{cen.id}</span>
                  <span className="truncate">{cen.titulo}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

function Pasta({ tipo, demandas }: { tipo: string; demandas: Demanda[] }) {
  const { d } = useRota()
  const [aberta, setAberta] = useState(demandas.some((x) => x.dossie === d))
  return (
    <li>
      <button
        type="button"
        onClick={() => setAberta(!aberta)}
        className="flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-md px-1 text-[12px] font-medium text-texto hover:bg-superficie"
      >
        <Seta aberto={aberta} />
        {aberta ? <FolderOpen size={13} className="text-texto-2" /> : <Folder size={13} className="text-texto-2" />}
        <span className="flex-1 text-left">{tipo}</span>
        <span className="text-[10px] font-normal text-texto-3">{demandas.length}</span>
      </button>
      {aberta && (
        <ul>
          {demandas.map((x) => (
            <NoDemanda key={x.dossie} demanda={x} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function Arvore() {
  const { p } = useRota()
  const { data, isPending, error } = useDemandas(p)
  if (isPending) return <Carregando />
  if (error) return <Erro erro={error} />
  const porTipo = new Map<string, Demanda[]>()
  for (const x of data) porTipo.set(x.tipo, [...(porTipo.get(x.tipo) ?? []), x])
  return (
    <ul className="px-2">
      {[...porTipo].map(([tipo, lista]) => (
        <Pasta key={tipo} tipo={tipo} demandas={lista} />
      ))}
    </ul>
  )
}
