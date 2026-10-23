import { PanelLeftClose } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { ContextoTopo } from './contextoTopo'

export function Shell() {
  const [migalhas, setMigalhas] = useState<HTMLElement | null>(null)
  const [acoes, setAcoes] = useState<HTMLElement | null>(null)
  const [recolhida, setRecolhida] = useState(false)

  return (
    <ContextoTopo.Provider value={{ migalhas, acoes }}>
      <div className="flex h-full min-w-[1180px] bg-fundo">
        {!recolhida && <Sidebar />}
        <main className="flex min-w-0 flex-1 flex-col bg-painel">
          <div className="flex h-11 shrink-0 items-center gap-3 border-b border-borda px-4">
            <button
              type="button"
              onClick={() => setRecolhida(!recolhida)}
              className="cursor-pointer text-texto-3 hover:text-texto"
              aria-label={recolhida ? 'Mostrar menu' : 'Recolher menu'}
            >
              <PanelLeftClose size={15} className={recolhida ? 'rotate-180' : ''} />
            </button>
            <div ref={setMigalhas} className="min-w-0 flex-1" />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-5 pb-4">
            <h1 className="text-[22px] font-medium tracking-tight">Testes</h1>
            <div ref={setAcoes} className="flex items-center gap-1.5" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </ContextoTopo.Provider>
  )
}
