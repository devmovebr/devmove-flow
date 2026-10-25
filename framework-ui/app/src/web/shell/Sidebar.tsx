import { ChevronsUpDown, FlaskConical, MessagesSquare, ScrollText } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router'
import { useConversas, useInfo, useProjetos } from '../api/consultas'
import { Avatar } from '../ui/Avatar'
import { caminhos, useRota } from '../util/caminhos'

const classeItem = ({ isActive }: { isActive: boolean }) =>
  `flex h-8 items-center gap-2.5 rounded-md px-2 text-[12px] ${isActive ? 'bg-superficie-2 font-medium text-texto' : 'text-texto-2 hover:bg-superficie hover:text-texto'}`

function Secao({ titulo }: { titulo: string }) {
  return <div className="px-3 pt-5 pb-2 text-[10px] font-medium tracking-[0.08em] text-texto-3 uppercase">{titulo}</div>
}

function SeletorProjeto() {
  const { p } = useRota()
  const navegar = useNavigate()
  const { data: projetos = [], isError } = useProjetos()
  const opcoes = projetos.some((x) => x.nome === p) ? projetos : [{ nome: p, caminho: '' }, ...projetos]

  return (
    <label className="relative mx-3 flex h-9 items-center gap-2 rounded-lg border border-borda bg-superficie px-2.5 hover:border-borda-forte">
      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-acento-suave text-[10px] font-semibold text-acento-forte uppercase">
        {p.slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{p || 'Projeto'}</span>
      <ChevronsUpDown size={13} className="shrink-0 text-texto-3" />
      <select
        aria-label="Projeto"
        value={p}
        title={isError ? 'Lista de projetos indisponível' : undefined}
        onChange={(e) => navegar(caminhos.demandas(e.target.value))}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {opcoes.map((x) => (
          <option key={x.nome} value={x.nome}>
            {x.nome}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Sidebar() {
  const { p } = useRota()
  const { data: info } = useInfo()
  const usuario = info?.usuario ?? ''
  const { data: conversas = [] } = useConversas(p)
  const aguardando = conversas.reduce((n, c) => n + c.aguardando, 0)
  return (
    <aside className="flex w-[216px] shrink-0 flex-col border-r border-borda bg-fundo">
      <div className="flex h-11 items-center gap-2 px-4">
        <span className="flex size-6 items-center justify-center rounded-full bg-texto">
          <span className="size-2.5 rounded-full bg-fundo" />
        </span>
        <span className="text-[13px] font-semibold tracking-tight">DevMove</span>
        <span className="text-[13px] text-texto-3">Painel</span>
      </div>

      <Secao titulo="Projeto" />
      <SeletorProjeto />

      <Secao titulo="Menu" />
      <nav className="flex flex-col gap-0.5 px-2">
        <NavLink to={caminhos.demandas(p)} className={classeItem}>
          <FlaskConical size={14} />
          Testes
        </NavLink>
        <NavLink to={caminhos.mensagens(p)} className={classeItem}>
          <MessagesSquare size={14} />
          Mensagens
          {aguardando > 0 && (
            <span
              title={`${aguardando} pergunta(s) aguardando resposta no Mission Control`}
              className="ml-auto rounded-full bg-pendente/15 px-1.5 py-px text-[10px] font-medium text-pendente tabular-nums"
            >
              {aguardando}
            </span>
          )}
        </NavLink>
        <span aria-disabled className="flex h-8 cursor-not-allowed items-center gap-2.5 rounded-md px-2 text-[12px] text-texto-3">
          <ScrollText size={14} />
          Logs
          <span className="ml-auto rounded-full bg-superficie-2 px-1.5 py-px text-[9px] font-medium text-texto-3">em breve</span>
        </span>
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-borda px-4 py-3">
        <Avatar nome={usuario} tamanho={28} />
        <div className="leading-tight">
          <div className="text-[12px] font-medium capitalize">{usuario}</div>
          <div className="text-[10px] text-texto-3">versão {info?.versao ?? '...'}</div>
        </div>
      </div>
    </aside>
  )
}
