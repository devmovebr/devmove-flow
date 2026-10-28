const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const dois = (n: number) => String(n).padStart(2, '0')

// Data sem hora (`2026-09-14`) é lida ao meio-dia local para não virar o dia anterior em fusos negativos.
function formatar(valor: string, f: (d: Date) => string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00`) : new Date(valor)
  return Number.isNaN(d.getTime()) ? valor : f(d)
}

const dia = (d: Date) => `${d.getDate()} ${meses[d.getMonth()]}`
const hm = (d: Date) => `${dois(d.getHours())}:${dois(d.getMinutes())}`

export const dataCurta = (valor: string) => formatar(valor, (d) => `${dia(d)} ${hm(d)}`)
export const dataDia = (valor: string) => formatar(valor, (d) => `${dia(d)} ${d.getFullYear()}`)
export const dataCompleta = (valor: string) => formatar(valor, (d) => `${dia(d)} ${d.getFullYear()}, ${hm(d)}`)
export const hora = (valor: string) => formatar(valor, (d) => `${hm(d)}:${dois(d.getSeconds())}`)

export function tempo(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} s`
}

export function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`
}

export const custo = (usd: number) => `US$ ${usd.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

export function slugCurto(slug: string): string {
  return slug.replace(/^\d{4}-\d{2}-\d{2}-/, '')
}

export function caminhoUrl(url: string): string {
  return url.replace(/^(https?:\/\/[^/]+|\{\{[A-Za-z0-9_]+\}\})/, '') || '/'
}

export function iniciais(nome: string): string {
  const partes = nome.split(/[\s\-_.]+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? partes[0]?.[1] ?? '')).toUpperCase()
}

// Tempo entre `de` e `ate` (ou agora): 42s, 7min, 2h05.
export function duracao(de: string | null, ate?: string | null): string {
  if (!de) return ''
  const s = Math.max(0, Math.round(((ate ? Date.parse(ate) : Date.now()) - Date.parse(de)) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}min`
  return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`
}
