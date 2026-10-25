import { ChevronRight } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { useModulo, useRota } from '../util/caminhos'
import { useAlvosTopo } from './contextoTopo'

export type Migalha = { rotulo: string; para?: string }

// Cada tela declara o fim do breadcrumb e as ações do cabeçalho; o shell desenha.
export function Topo({ migalhas, children }: { migalhas: Migalha[]; children?: ReactNode }) {
  const alvos = useAlvosTopo()
  const { p } = useRota()
  const todas: Migalha[] = [{ rotulo: p }, useModulo(), ...migalhas]

  return (
    <>
      {alvos.migalhas &&
        createPortal(
          <nav className="flex min-w-0 items-center gap-1.5 text-[11px] text-texto-3">
            {todas.map((m, i) => (
              <Fragment key={i}>
                {i > 0 && <ChevronRight size={11} className="shrink-0" />}
                {m.para && i < todas.length - 1 ? (
                  <Link to={m.para} className="truncate hover:text-texto">
                    {m.rotulo}
                  </Link>
                ) : (
                  <span className={`truncate ${i === todas.length - 1 ? 'text-texto-2' : ''}`}>{m.rotulo}</span>
                )}
              </Fragment>
            ))}
          </nav>,
          alvos.migalhas,
        )}
      {alvos.acoes && children && createPortal(children, alvos.acoes)}
    </>
  )
}
