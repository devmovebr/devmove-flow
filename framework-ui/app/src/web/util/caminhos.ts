import { useLocation, useParams } from 'react-router'

const seg = encodeURIComponent

export const caminhos = {
  mensagens: (p: string) => `/${seg(p)}/mensagens`,
  conversa: (p: string, d: string) => `/${seg(p)}/mensagens/${d}`,
  demandas: (p: string) => `/${seg(p)}/testes`,
  suite: (p: string, d: string) => `/${seg(p)}/testes/${d}`,
  rodada: (p: string, d: string, id: number) => `/${seg(p)}/testes/${d}/rodadas/${id}`,
  cenario: (p: string, d: string, c: string) => `/${seg(p)}/testes/${d}/cenarios/${seg(c)}`,
  comparar: (p: string, d: string) => `/${seg(p)}/testes/${d}/comparar`,
}

// O dossiê `<tipo>/<slug>` ocupa dois segmentos da URL.
export function useRota() {
  const { p = '', tipo = '', slug = '', id, c = '' } = useParams()
  return { p, d: tipo && slug ? `${tipo}/${slug}` : '', tipo, slug, id: id ? Number(id) : null, c }
}

export function useModulo(): { rotulo: string; para: string } {
  const { p } = useRota()
  const { pathname } = useLocation()
  return pathname.split('/')[2] === 'mensagens'
    ? { rotulo: 'Mensagens', para: caminhos.mensagens(p) }
    : { rotulo: 'Testes', para: caminhos.demandas(p) }
}
