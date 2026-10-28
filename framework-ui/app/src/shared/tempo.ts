// Tempo entre `de` e `ate` (ou agora): 42s, 7min, 2h05.
export function duracao(de: string | null, ate?: string | null): string {
  if (!de) return ''
  const s = Math.max(0, Math.round(((ate ? Date.parse(ate) : Date.now()) - Date.parse(de)) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}min`
  return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`
}
