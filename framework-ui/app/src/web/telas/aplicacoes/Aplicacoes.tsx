import { AlertTriangle, Check, CircleStop, Copy, FolderGit2, Loader2, Play, RotateCw, Server, Square, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { AcaoApp, App, RepoCodigo, SituacaoApp, Subida } from '../../../shared/tipos'
import { useAcaoApp, useApps, useSubidas } from '../../api/consultas'
import { Topo } from '../../shell/Topo'
import { Carregando, Erro, Vazio } from '../../ui/Estado'
import { caminhos, useRota } from '../../util/caminhos'
import { dataCurta, duracao } from '../../util/formato'
import { ConsoleApp } from './ConsoleApp'

const ativa = (s: SituacaoApp) => s === 'subindo' || s === 'no_ar' || s === 'parando'

const selos: Record<SituacaoApp, { classe: string; rotulo: string; icone: LucideIcon; gira?: boolean }> = {
  no_ar: { classe: 'bg-passou/15 text-passou', rotulo: 'no ar', icone: Check },
  subindo: { classe: 'bg-pendente/15 text-pendente', rotulo: 'subindo', icone: Loader2, gira: true },
  parando: { classe: 'bg-pendente/15 text-pendente', rotulo: 'parando', icone: Loader2, gira: true },
  falhou: { classe: 'bg-falhou/15 text-falhou', rotulo: 'falhou', icone: AlertTriangle },
  parada: { classe: 'bg-superficie-2 text-texto-3', rotulo: 'parada', icone: CircleStop },
}

export function SeloApp({ situacao }: { situacao: SituacaoApp }) {
  const { classe, rotulo, icone: Icone, gira } = selos[situacao]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${classe}`}>
      <Icone size={10} className={gira ? 'animate-spin' : ''} />
      {rotulo}
    </span>
  )
}

function BotaoAcao({ icone: Icone, titulo, onClick, desabilitado }: { icone: LucideIcon; titulo: string; onClick: () => void; desabilitado: boolean }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      disabled={desabilitado}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-texto-2 transition-colors hover:bg-superficie-3 hover:text-texto disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icone size={13} />
    </button>
  )
}

function LinhaApp({ app, selecionada, supervisorLigado }: { app: App; selecionada: boolean; supervisorLigado: boolean }) {
  const { p } = useRota()
  const navegar = useNavigate()
  const acao = useAcaoApp(p)
  // O POST só enfileira; o supervisor age até 1s depois. A linha fica travada até o estado da app mudar,
  // senão um segundo clique entra na fila atrás do primeiro.
  const assinatura = `${app.situacao}|${app.iniciada_em}|${app.finalizada_em}`
  const [pedidoEm, setPedidoEm] = useState<string | null>(null)
  const aguardando = pedidoEm === assinatura || (acao.isPending && acao.variables?.app === app.nome)
  const transicao = app.situacao === 'subindo' || app.situacao === 'parando'
  const titulo = supervisorLigado ? '' : ' (supervisor desligado)'
  const abrir = () => navegar(caminhos.aplicacao(p, app.nome))
  const executar = (a: AcaoApp) => {
    if (!selecionada) abrir()
    setPedidoEm(assinatura)
    acao.mutate({ app: app.nome, acao: a }, { onError: () => setPedidoEm(null) })
  }
  const ligada = ativa(app.situacao)
  const bloqueada = !supervisorLigado || aguardando

  return (
    <div
      role="button"
      tabIndex={0}
      title={[app.nome, app.repo !== app.nome && app.repo, selos[app.situacao].rotulo, app.porta && `:${app.porta}`].filter(Boolean).join(' · ')}
      onClick={abrir}
      onKeyDown={(e) => e.key === 'Enter' && abrir()}
      className={`group flex cursor-pointer items-center gap-3 border-b border-borda px-4 py-3 ${selecionada ? 'bg-superficie-2' : 'hover:bg-superficie'}`}
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-md border ${app.situacao === 'no_ar' ? 'border-passou/40 text-passou' : 'border-borda-forte text-texto-2'}`}
      >
        <Server size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium">{app.nome}</span>
          <SeloApp situacao={app.situacao} />
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-texto-3">
          {app.repo !== app.nome && <span>{app.repo}</span>}
          {app.porta && (
            <a
              href={`http://localhost:${app.porta}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-info hover:underline"
            >
              :{app.porta}
            </a>
          )}
          {ligada && app.iniciada_em && <span>há {duracao(app.iniciada_em)}</span>}
          {app.situacao === 'falhou' && app.erro && <span className="truncate text-falhou">{app.erro}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        {aguardando && <Loader2 size={13} className="mr-1 animate-spin text-texto-3" />}
        {ligada ? (
          <>
            <BotaoAcao icone={RotateCw} titulo={`Reiniciar${titulo}`} onClick={() => executar('reiniciar')} desabilitado={bloqueada || transicao} />
            <BotaoAcao icone={Square} titulo={`Parar${titulo}`} onClick={() => executar('parar')} desabilitado={bloqueada || app.situacao === 'parando'} />
          </>
        ) : (
          <BotaoAcao icone={Play} titulo={`Subir${titulo}`} onClick={() => executar('subir')} desabilitado={bloqueada} />
        )}
      </div>
    </div>
  )
}

function LinhaRepo({ repo }: { repo: RepoCodigo }) {
  return (
    <div className="flex items-center gap-3 border-b border-borda px-4 py-2.5 text-texto-3">
      <FolderGit2 size={13} className="shrink-0" />
      <span className="truncate text-[12px]">{repo.nome}</span>
      <span className="ml-auto text-[10px] whitespace-nowrap">{repo.clonado ? 'sem roteiro' : 'não clonado'}</span>
    </div>
  )
}

function Subidas({ subidas }: { subidas: Subida[] }) {
  if (!subidas.length) return null
  return (
    <>
      <div className="px-4 pt-5 pb-2 text-[10px] font-medium tracking-[0.08em] text-texto-3 uppercase">Últimas subidas</div>
      {subidas.slice(0, 8).map((s) => (
        <div key={s.id} className="flex items-center gap-2 px-4 py-1.5 text-[11px] text-texto-2">
          <span className="tabular-nums">{dataCurta(s.iniciada_em)}</span>
          <span className="truncate text-texto-3">{s.autor}</span>
          <span className="ml-auto whitespace-nowrap text-texto-3 tabular-nums">
            {s.finalizada_em ? duracao(s.iniciada_em, s.finalizada_em) : 'em curso'}
          </span>
          {s.situacao_final && (
            <span className={s.situacao_final === 'falhou' ? 'text-falhou' : 'text-texto-3'}>
              {s.situacao_final === 'falhou' ? `falhou${s.codigo_saida !== null ? ` (${s.codigo_saida})` : ''}` : 'parada'}
            </span>
          )}
        </div>
      ))}
    </>
  )
}

function BannerSupervisor() {
  const [copiado, setCopiado] = useState(false)
  const comando = 'tools/apps.sh ligar'
  return (
    <div className="mx-6 mb-3 flex items-center gap-3 rounded-lg border border-pendente/30 bg-pendente/8 px-3 py-2.5 text-[12px]">
      <AlertTriangle size={14} className="shrink-0 text-pendente" />
      <span className="text-texto-2">
        Supervisor desligado: o play e o stop só funcionam com ele rodando no host. Na pasta do projeto, rode{' '}
        <code className="rounded bg-superficie-2 px-1.5 py-0.5 font-mono text-[11px] text-texto">{comando}</code>
      </span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(comando)
          setCopiado(true)
          setTimeout(() => setCopiado(false), 1500)
        }}
        className="ml-auto inline-flex cursor-pointer items-center gap-1 text-[11px] text-texto-3 hover:text-texto"
      >
        {copiado ? <Check size={12} /> : <Copy size={12} />}
        {copiado ? 'copiado' : 'copiar'}
      </button>
    </div>
  )
}

const LARGURA = { padrao: 340, min: 260, max: 720, chave: 'devmove.aplicacoes.largura' }

function salvarLargura(largura: number) {
  try {
    localStorage.setItem(LARGURA.chave, String(largura))
  } catch {
    // sem storage, a largura vale só até recarregar
  }
}

function lerLargura() {
  try {
    const salva = Number(localStorage.getItem(LARGURA.chave))
    return salva >= LARGURA.min && salva <= LARGURA.max ? salva : LARGURA.padrao
  } catch {
    return LARGURA.padrao
  }
}

function useLarguraArrastavel() {
  const [largura, setLargura] = useState(lerLargura)

  const iniciar = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const x0 = e.clientX
    const l0 = largura
    let atual = l0
    const mover = (ev: PointerEvent) => {
      atual = Math.min(LARGURA.max, Math.max(LARGURA.min, l0 + ev.clientX - x0))
      setLargura(atual)
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
      salvarLargura(atual)
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  const restaurar = () => {
    setLargura(LARGURA.padrao)
    salvarLargura(LARGURA.padrao)
  }

  return { largura, iniciar, restaurar }
}

export function Aplicacoes() {
  const { largura, iniciar, restaurar } = useLarguraArrastavel()
  const { p, app: selecionada } = useRota()
  const { data, isPending, error } = useApps(p)
  const nome = selecionada || data?.apps[0]?.nome || ''
  const app = data?.apps.find((a) => a.nome === nome)
  const { data: subidas = [] } = useSubidas(p, app ? nome : '')

  return (
    <>
      <Topo migalhas={selecionada ? [{ rotulo: selecionada }] : []} />
      {data && !data.supervisor.ligado && data.apps.length > 0 && <BannerSupervisor />}
      {data?.erro_config && (
        <div className="mx-6 mb-3 flex items-center gap-2 rounded-lg border border-falhou/25 bg-falhou/8 px-3 py-2.5 text-[12px] text-falhou">
          <AlertTriangle size={14} className="shrink-0" />
          tools/.local/apps.json: {data.erro_config}
        </div>
      )}
      {isPending && <Carregando />}
      {error && <Erro erro={error} />}
      {data && !data.apps.length && !data.erro_config && (
        <Vazio texto="Nenhuma aplicação configurada. Rode /apps no Claude Code desta cópia: ele descobre como subir cada repositório e grava tools/.local/apps.json." />
      )}
      {data && data.apps.length > 0 && (
        <div className="flex min-h-0 flex-1 border-t border-borda">
          <aside style={{ width: largura }} className="shrink-0 overflow-y-auto border-r border-borda pb-4">
            {data.apps.map((a) => (
              <LinhaApp key={a.nome} app={a} selecionada={a.nome === nome} supervisorLigado={data.supervisor.ligado} />
            ))}
            {data.repos_sem_app.length > 0 && (
              <>
                <div
                  className="px-4 pt-5 pb-2 text-[10px] font-medium tracking-[0.08em] text-texto-3 uppercase"
                  title="Repositórios de tools/repos.txt sem app em tools/.local/apps.json: rode /apps <repo> no Claude Code"
                >
                  Sem roteiro de subida
                </div>
                {data.repos_sem_app.map((r) => (
                  <LinhaRepo key={r.nome} repo={r} />
                ))}
              </>
            )}
            <Subidas subidas={subidas} />
          </aside>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar lista de aplicações"
            title="Arraste para redimensionar · duplo clique volta ao padrão"
            onPointerDown={iniciar}
            onDoubleClick={restaurar}
            className="relative z-10 -ml-[3px] w-[5px] shrink-0 cursor-col-resize transition-colors hover:bg-info/40 active:bg-info/60"
          />
          {app ? <ConsoleApp key={app.nome} app={app} /> : <Vazio texto={`Aplicação ${selecionada} não está em tools/.local/apps.json.`} />}
        </div>
      )}
    </>
  )
}
