import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RepoCodigo } from '../../shared/tipos.ts'
import { lerCacheado } from '../arquivos.ts'
import { repositorio } from '../banco.ts'
import { ErroRunner } from '../erros.ts'
import { type ConfigApp, NOME_VALIDO } from './config.ts'

type RepoTxt = Pick<RepoCodigo, 'nome' | 'url' | 'pasta'>

export const arquivoRepos = (ws: string) => join(ws, 'tools', 'repos.txt')

// `<pasta em code/> <url git>` por linha; comentário e marcador do framework não instalado ficam de fora.
export function parsearRepos(texto: string): RepoTxt[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('{{'))
    .map((l) => l.split(/\s+/))
    .filter(([nome, url]) => nome && url)
    .map(([nome, url]) => ({ nome, url, pasta: `code/${nome}` }))
}

const espelhados = new Map<string, RepoTxt[]>()

// O parse é memoizado por mtime: a mesma lista em memória significa repos.txt sem mudança, e o banco
// só é regravado quando o arquivo muda.
export function sincronizarRepos(ws: string): void {
  const arq = arquivoRepos(ws)
  const lista = existsSync(arq) ? lerCacheado(arq, parsearRepos) : []
  if (espelhados.get(ws) === lista) return
  repositorio(ws).sincronizarRepos(lista)
  espelhados.set(ws, lista)
}

// Só o servidor da UI espelha no banco (`espelhar`). O CLI roda no host e lê o repos.txt direto: o SQLite em
// WAL não é coerente entre o host e o container do Docker Desktop, então o banco tem um lado só gravando.
export function listarRepos(ws: string, config: ConfigApp[], espelhar: boolean): RepoCodigo[] {
  let repos: RepoTxt[]
  if (espelhar) {
    sincronizarRepos(ws)
    repos = repositorio(ws).repos()
  } else repos = existsSync(arquivoRepos(ws)) ? parsearRepos(readFileSync(arquivoRepos(ws), 'utf8')) : []
  return repos.map((r) => ({ ...r, clonado: existsSync(join(ws, r.pasta)), apps: config.filter((c) => c.repo === r.nome).map((c) => c.nome) }))
}

function git(ws: string, args: string[], herdar = false): string {
  return execFileSync('git', ['-C', ws, ...args], { encoding: 'utf8', stdio: herdar ? 'inherit' : 'pipe' }) ?? ''
}

// Clona em code/, acrescenta ao repos.txt e commita só ele. O banco recebe na próxima leitura da UI.
export function adicionarRepo(ws: string, nome: string, url: string, log: (msg: string) => void): void {
  if (!NOME_VALIDO.test(nome)) throw new ErroRunner(`nome inválido: ${nome} (letras, números, ponto, hífen e sublinhado)`)
  if (!url || /\s/.test(url) || url.startsWith('-')) throw new ErroRunner(`url inválida: ${url}`)
  const arq = arquivoRepos(ws)
  const atuais = existsSync(arq) ? parsearRepos(readFileSync(arq, 'utf8')) : []
  if (atuais.some((r) => r.nome === nome)) throw new ErroRunner(`${nome} já está em tools/repos.txt`, 409)
  const destino = join(ws, 'code', nome)
  if (existsSync(join(destino, '.git'))) log(`= ${nome}: já clonado em code/${nome}`)
  else {
    log(`+ ${nome}: clone de ${url}`)
    execFileSync('git', ['clone', '-q', '--', url, destino], { stdio: 'inherit' })
  }
  if (!existsSync(arq)) writeFileSync(arq, '# Um repositório por linha: <pasta em code/> <url git>\n')
  const texto = readFileSync(arq, 'utf8')
  appendFileSync(arq, `${texto && !texto.endsWith('\n') ? '\n' : ''}${nome} ${url}\n`)
  let versionado = false
  try {
    versionado = git(ws, ['rev-parse', '--is-inside-work-tree']).trim() === 'true'
  } catch {
    // workspace sem git
  }
  if (versionado) {
    git(ws, ['add', '--', 'tools/repos.txt'])
    git(ws, ['commit', '-q', '-m', `chore(repos): adiciona ${nome}`, '--', 'tools/repos.txt'], true)
    log(`commit: chore(repos): adiciona ${nome}`)
  } else log('workspace sem git: tools/repos.txt alterado sem commit')
}
