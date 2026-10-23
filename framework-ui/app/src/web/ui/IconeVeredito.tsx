import { Ban, Check, Loader2, X } from 'lucide-react'
import { cor, rotulo, type Situacao } from '../util/veredito'

type Props = { situacao: Situacao | 'EXECUTANDO'; tamanho?: number }

export function IconeVeredito({ situacao, tamanho = 16 }: Props) {
  const interno = Math.round(tamanho * 0.62)
  if (situacao === 'EXECUTANDO') {
    return <Loader2 size={tamanho} className="shrink-0 animate-spin text-acento-forte" aria-label="Executando" />
  }
  if (situacao === 'NAO_EXECUTADO') {
    return (
      <span
        title={rotulo[situacao]}
        className="inline-block shrink-0 rounded-full border-[1.5px] border-texto-3"
        style={{ width: tamanho, height: tamanho }}
      />
    )
  }
  if (situacao === 'BLOQUEADO') {
    return <Ban size={tamanho} className="shrink-0" style={{ color: cor.BLOQUEADO }} aria-label={rotulo.BLOQUEADO} />
  }
  return (
    <span
      title={rotulo[situacao]}
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[#141114]"
      style={{ width: tamanho, height: tamanho, background: cor[situacao] }}
    >
      {situacao === 'PASSOU' && <Check size={interno} strokeWidth={3.5} />}
      {situacao === 'FALHOU' && <X size={interno} strokeWidth={3.5} />}
      {situacao === 'PENDENTE' && <span className="text-[length:var(--t)] leading-none font-bold" style={{ ['--t' as string]: `${interno}px` }}>!</span>}
    </span>
  )
}
