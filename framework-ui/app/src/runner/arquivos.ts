import { closeSync, openSync, readFileSync, readSync, statSync } from 'node:fs'

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

// Lê do byte `de` até a última quebra de linha. `ate` = -1 quando o arquivo encolheu (foi recriado).
// Linha incompleta no fim fica para a próxima leitura.
export function lerTrecho(arq: string, de: number): { texto: string; ate: number } {
  const tamanho = statSync(arq).size
  if (tamanho <= de) return { texto: '', ate: tamanho < de ? -1 : de }
  const fd = openSync(arq, 'r')
  try {
    const buf = Buffer.alloc(tamanho - de)
    const lidos = readSync(fd, buf, 0, buf.length, de)
    const completo = buf.subarray(0, lidos).lastIndexOf(0x0a) + 1
    return { texto: buf.toString('utf8', 0, completo), ate: de + completo }
  } finally {
    closeSync(fd)
  }
}

// Início da última linha completa dentro dos `bytes` finais do arquivo.
export function inicioDaCauda(arq: string, bytes: number): number {
  const tamanho = statSync(arq).size
  if (tamanho <= bytes) return 0
  const fd = openSync(arq, 'r')
  try {
    const buf = Buffer.alloc(Math.min(bytes, 64 * 1024))
    const de = tamanho - bytes
    const lidos = readSync(fd, buf, 0, buf.length, de)
    const quebra = buf.subarray(0, lidos).indexOf(0x0a)
    return quebra < 0 ? de : de + quebra + 1
  } finally {
    closeSync(fd)
  }
}
