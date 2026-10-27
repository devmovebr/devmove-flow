import type { Placar, Veredito } from '../../shared/tipos'

export type Situacao = Veredito | 'NAO_EXECUTADO'

export const rotulo: Record<Situacao, string> = {
  PASSOU: 'Passou',
  FALHOU: 'Falhou',
  PENDENTE: 'Pendente',
  BLOQUEADO: 'Bloqueado',
  NAO_EXECUTADO: 'Não executado',
}

export const cor: Record<Situacao, string> = {
  PASSOU: 'var(--color-passou)',
  FALHOU: 'var(--color-falhou)',
  PENDENTE: 'var(--color-pendente)',
  BLOQUEADO: 'var(--color-bloqueado)',
  NAO_EXECUTADO: 'var(--color-texto-3)',
}

export const vereditos: Veredito[] = ['PASSOU', 'FALHOU', 'PENDENTE', 'BLOQUEADO']

export function percentual(placar: Placar, campo: 'passou' | 'falhou' = 'passou'): number {
  return placar.total ? Math.round((placar[campo] / placar.total) * 100) : 0
}

export function executados(placar: Placar): number {
  return placar.total - placar.nao_executado
}

export const statusRodada: Record<string, string> = {
  executando: 'Executando',
  concluida: 'Concluída',
  interrompida: 'Interrompida',
}

export function corStatusIndex(status: string): string {
  const s = status.toLowerCase()
  if (/aprovad|conclu|fechad|ok/.test(s)) return 'var(--color-passou)'
  if (/reprovad|bug|falh/.test(s)) return 'var(--color-falhou)'
  if (/andamento|execu|aberto|testando/.test(s)) return 'var(--color-pendente)'
  return 'var(--color-info)'
}

export function statusCurto(status: string): string {
  return status.split('(')[0].trim() || status
}
