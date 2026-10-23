export type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma'

const estilos: Record<Variante, string> = {
  primario: 'bg-acento text-white hover:bg-acento-forte',
  secundario: 'border border-borda-forte bg-superficie-2 text-texto hover:bg-superficie-3',
  perigo: 'border border-falhou/50 text-falhou hover:bg-falhou/10',
  fantasma: 'text-texto-2 hover:bg-superficie-2 hover:text-texto',
}

export function classeBotao(variante: Variante = 'secundario'): string {
  return `inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[12px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${estilos[variante]}`
}
