import type { EventoSessao } from '../../../shared/tipos'

export type Bloco =
  | { tipo: 'ferramenta'; chave: string; chamada: EventoSessao; resultado: EventoSessao | null }
  | { tipo: 'evento'; chave: string; evento: EventoSessao }

export type Terminal = { blocos: Bloco[]; subagentesAtivos: number }

// Como no Claude Code, a chamada e o resultado saem num bloco só, no lugar da chamada; resultado sem
// chamada conhecida vira bloco próprio.
export function montarTerminal(eventos: EventoSessao[]): Terminal {
  const blocos: Bloco[] = []
  const chamadas = new Map<string, number>()
  const ativos = new Set<string>()
  eventos.forEach((e, i) => {
    const chave = `${i}`
    if (e.kind === 'tool' && e.id) {
      chamadas.set(e.id, blocos.length)
      blocos.push({ tipo: 'ferramenta', chave, chamada: e, resultado: null })
      return
    }
    if (e.kind === 'result' && e.id && chamadas.has(e.id)) {
      const n = chamadas.get(e.id)!
      blocos[n] = { ...(blocos[n] as Extract<Bloco, { tipo: 'ferramenta' }>), resultado: e }
      return
    }
    if (e.kind === 'agent' && e.agent) {
      if (e.status === 'started') ativos.add(e.agent)
      else if (e.status !== 'progress') ativos.delete(e.agent)
    }
    blocos.push({ tipo: 'evento', chave, evento: e })
  })
  return { blocos, subagentesAtivos: ativos.size }
}
