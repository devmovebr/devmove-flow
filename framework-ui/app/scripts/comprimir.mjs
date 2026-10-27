// Gera .br e .gz ao lado dos arquivos de texto do build; o @fastify/static serve a versão comprimida quando o navegador aceita.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const raiz = join(import.meta.dirname, '..', 'dist', 'web')
const TEXTO = /\.(js|css|html|svg|json)$/
const MINIMO = 1024

for (const nome of readdirSync(raiz, { recursive: true, encoding: 'utf8' })) {
  if (!TEXTO.test(nome)) continue
  const arq = join(raiz, nome)
  const dados = readFileSync(arq)
  if (dados.length < MINIMO) continue
  writeFileSync(`${arq}.br`, brotliCompressSync(dados, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }))
  writeFileSync(`${arq}.gz`, gzipSync(dados, { level: 9 }))
}
