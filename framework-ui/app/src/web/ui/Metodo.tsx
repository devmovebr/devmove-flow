import { corMetodo } from '../util/metodo'

export function Metodo({ metodo }: { metodo: string }) {
  return (
    <span className="font-mono text-[11px] font-semibold tracking-wide" style={{ color: corMetodo(metodo) }}>
      {metodo.toUpperCase()}
    </span>
  )
}
