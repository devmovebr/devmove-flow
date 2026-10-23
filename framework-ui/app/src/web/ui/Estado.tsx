import { AlertCircle, Inbox, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

export function Carregando({ texto = 'Carregando' }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-10 text-texto-3">
      <Loader2 size={14} className="animate-spin" />
      {texto}
    </div>
  )
}

export function Vazio({ texto, children }: { texto: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-texto-3">
      <Inbox size={20} strokeWidth={1.5} />
      <span>{texto}</span>
      {children}
    </div>
  )
}

export function Erro({ erro }: { erro: unknown }) {
  const mensagem = erro instanceof Error ? erro.message : String(erro)
  return (
    <div className="m-4 flex items-start gap-2 rounded-lg border border-falhou/25 bg-falhou/8 px-3 py-2.5 text-[12px] text-falhou">
      <AlertCircle size={14} className="mt-0.5 shrink-0" />
      <span>Não foi possível carregar. {mensagem}</span>
    </div>
  )
}
