import { readFileSync, statSync } from 'node:fs'

const lidos = new Map<string, { assinatura: string; valor: unknown }>()

// Parse memoizado pela assinatura do arquivo (mtime + tamanho): só relê o que mudou no disco.
// O valor é compartilhado entre chamadas; quem recebe não deve mutá-lo.
export function lerCacheado<T>(arq: string, parse: (texto: string) => T): T {
  const st = statSync(arq)
  const assinatura = `${st.mtimeMs}:${st.size}`
  const lido = lidos.get(arq)
  if (lido?.assinatura === assinatura) return lido.valor as T
  const valor = parse(readFileSync(arq, 'utf8'))
  lidos.set(arq, { assinatura, valor })
  return valor
}
