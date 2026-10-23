import { iniciais } from '../util/formato'

const paleta = ['#5b8def', '#e0607e', '#45b39d', '#d39b3f', '#9b6be0', '#4fa6c9']

export function Avatar({ nome, tamanho = 22 }: { nome: string; tamanho?: number }) {
  const indice = [...nome].reduce((s, ch) => s + ch.charCodeAt(0), 0) % paleta.length
  return (
    <span
      title={nome}
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white ring-2 ring-painel"
      style={{ width: tamanho, height: tamanho, background: paleta[indice] }}
    >
      {iniciais(nome)}
    </span>
  )
}
