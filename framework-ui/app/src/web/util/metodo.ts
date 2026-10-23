const cores: Record<string, string> = {
  GET: '#4caf5c',
  POST: '#e8963a',
  PUT: '#5b8def',
  PATCH: '#9b6be0',
  DELETE: '#e2504c',
}

export const metodos = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

export function corMetodo(metodo: string): string {
  return cores[metodo.toUpperCase()] ?? 'var(--color-texto-2)'
}
