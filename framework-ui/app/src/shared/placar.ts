import type { Placar, Veredito } from './tipos.ts'

export type Contagem = Pick<Placar, 'passou' | 'falhou' | 'bloqueado' | 'pendente'>

const CAMPO: Record<Veredito, keyof Contagem> = { PASSOU: 'passou', FALHOU: 'falhou', BLOQUEADO: 'bloqueado', PENDENTE: 'pendente' }

// O placar é sempre sobre a suíte inteira: cenário sem execução conta como não executado.
export function placarDe(c: Contagem, total: number): Placar {
  const feitos = c.passou + c.falhou + c.bloqueado + c.pendente
  return { ...c, nao_executado: Math.max(0, total - feitos), total }
}

export function contarPlacar(vereditos: Veredito[], total: number): Placar {
  const c: Contagem = { passou: 0, falhou: 0, bloqueado: 0, pendente: 0 }
  for (const v of vereditos) c[CAMPO[v] ?? 'pendente']++
  return placarDe(c, total)
}
