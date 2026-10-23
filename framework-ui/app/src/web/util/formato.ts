const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function paraData(valor: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00`) : new Date(valor)
}

const dois = (n: number) => String(n).padStart(2, '0')

export function dataCurta(valor: string): string {
  const d = paraData(valor)
  if (Number.isNaN(d.getTime())) return valor
  return `${d.getDate()} ${meses[d.getMonth()]} ${dois(d.getHours())}:${dois(d.getMinutes())}`
}

export function dataDia(valor: string): string {
  const d = paraData(valor)
  if (Number.isNaN(d.getTime())) return valor
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
}

export function dataCompleta(valor: string): string {
  const d = paraData(valor)
  if (Number.isNaN(d.getTime())) return valor
  return `${dataDia(valor)}, ${dois(d.getHours())}:${dois(d.getMinutes())}`
}

export function tempo(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} s`
}

export function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`
}

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
