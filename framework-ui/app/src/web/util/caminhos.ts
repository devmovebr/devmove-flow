import { useLocation, useParams } from 'react-router'

const seg = encodeURIComponent

export const caminhos = {
  mensagens: (p: string) => `/${seg(p)}/mensagens`,
  conversa: (p: string, d: string) => `/${seg(p)}/mensagens/${d}`,
  logs: (p: string) => `/${seg(p)}/logs`,
  sessao: (p: string, item: string) => `/${seg(p)}/logs/${seg(item)}`,
  demandas: (p: string) => `/${seg(p)}/testes`,
  suite: (p: string, d: string) => `/${seg(p)}/testes/${d}`,
  rodada: (p: string, d: string, id: number) => `/${seg(p)}/testes/${d}/rodadas/${id}`,
  cenario: (p: string, d: string, c: string) => `/${seg(p)}/testes/${d}/cenarios/${seg(c)}`,
  comparar: (p: string, d: string) => `/${seg(p)}/testes/${d}/comparar`,
}

// O dossiê `<tipo>/<slug>` ocupa dois segmentos da URL.
export function useRota() {
  const { p = '', tipo = '', slug = '', id, c = '', item = '' } = useParams()
  return { p, d: tipo && slug ? `${tipo}/${slug}` : '', tipo, slug, id: id ? Number(id) : null, c, item }
}

export function useModulo(): { rotulo: string; para: string } {
  const { p } = useRota()
  const { pathname } = useLocation()
  const modulo = pathname.split('/')[2]
  if (modulo === 'mensagens') return { rotulo: 'Mensagens', para: caminhos.mensagens(p) }
  if (modulo === 'logs') return { rotulo: 'Logs de agentes', para: caminhos.logs(p) }
  return { rotulo: 'Testes', para: caminhos.demandas(p) }
}
