import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Props = { titulo: string; aoFechar: () => void; children: ReactNode; rodape?: ReactNode }

export function Modal({ titulo, aoFechar, children, rodape }: Props) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aoFechar])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={aoFechar}>
      <div
        role="dialog"
        aria-label={titulo}
        className="w-[380px] rounded-xl border border-borda-forte bg-superficie shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-borda px-4 py-3">
          <h2 className="text-[14px] font-medium">{titulo}</h2>
          <button type="button" onClick={aoFechar} className="cursor-pointer text-texto-3 hover:text-texto" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
        {rodape && <div className="flex justify-end gap-2 border-t border-borda px-4 py-3">{rodape}</div>}
      </div>
    </div>,
    document.body,
  )
}
