import { execFileSync, spawn } from 'node:child_process'
import { closeSync, existsSync, openSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync, writeSync } from 'node:fs'
import { connect } from 'node:net'
import { join } from 'node:path'
import type { AcaoApp, EstadoApp, SituacaoApp, SupervisorApps } from '../../shared/tipos.ts'
import { ErroRunner } from '../erros.ts'
import {
  arquivoBatimento,
  arquivoEstado,
  arquivoLog,
  arquivoSaida,
  type ConfigApp,
  configDe,
  garantirPastas,
  NOME_VALIDO,
  pastas,
} from './config.ts'
import { criarSubida, finalizarSubida } from './subidas.ts'

export const PARADA: EstadoApp = {
  situacao: 'parada',
  pid: null,
  iniciada_em: null,
  finalizada_em: null,
  codigo_saida: null,
  erro: null,
  autor: null,
  subida_id: null,
}

const ATIVAS: SituacaoApp[] = ['subindo', 'no_ar', 'parando']
export const ativa = (s: SituacaoApp) => ATIVAS.includes(s)

export function lerEstado(ws: string, app: string): EstadoApp {
  try {
    return { ...PARADA, ...(JSON.parse(readFileSync(arquivoEstado(ws, app), 'utf8')) as Partial<EstadoApp>) }
  } catch {
    return PARADA
  }
}

// Grava num temporário e renomeia para a UI nunca ler JSON pela metade. No Windows o rename falha se
// alguém está com o arquivo aberto naquele instante; aí vai direto.
function gravarJson(arq: string, dados: unknown): void {
  const tmp = `${arq}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(dados))
  try {
    renameSync(tmp, arq)
  } catch {
    writeFileSync(arq, JSON.stringify(dados))
    rmSync(tmp, { force: true })
  }
}

function gravarEstado(ws: string, app: string, e: EstadoApp): EstadoApp {
  gravarJson(arquivoEstado(ws, app), e)
  return e
}

export function vivo(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

// O wrapper roda os `antes` na raiz do workspace e o comando na pasta da app. O código de saída só é
// gravado quando a app termina sozinha: parada pela árvore de processos não chega ao `echo`.
const WRAPPER = `saida="$PWD/$DEVMOVE_APP_SAIDA"
while IFS= read -r antes <&3; do
  [ -z "$antes" ] && continue
  echo "\\$ $antes"
  (eval "$antes") </dev/null || { c=$?; echo "falhou: $antes (código $c)"; echo $c > "$saida"; exit $c; }
done 3<<< "$DEVMOVE_APP_ANTES"
cd "$DEVMOVE_APP_PASTA" || { echo 1 > "$saida"; exit 1; }
echo "\\$ $DEVMOVE_APP_CMD"
(eval "$DEVMOVE_APP_CMD")
c=$?
echo $c > "$saida"
exit $c`

function girarLog(ws: string, app: string): void {
  const atual = arquivoLog(ws, app)
  if (!existsSync(atual)) return
  try {
    rmSync(arquivoLog(ws, app, true), { force: true })
    renameSync(atual, arquivoLog(ws, app, true))
  } catch {
    writeFileSync(atual, '')
  }
}

export function subir(ws: string, app: string, autor: string): EstadoApp {
  const c = configDe(ws, app)
  const atual = lerEstado(ws, app)
  if (ativa(atual.situacao) && atual.pid && vivo(atual.pid)) throw new ErroRunner(`${app} já está ${atual.situacao} (pid ${atual.pid})`, 409)
  if (ativa(atual.situacao)) finalizar(ws, app, atual, 'parada', null, null)
  if (!existsSync(join(ws, c.pasta))) throw new ErroRunner(`pasta ${c.pasta} não existe: clone o repositório (tools/clonar-repos.sh)`)
  garantirPastas(ws)
  girarLog(ws, app)
  rmSync(arquivoSaida(ws, app), { force: true })
  // 'w', não 'a': o bash do Git no Windows não escreve em handle aberto só para append. O log já é novo a cada subida.
  const fd = openSync(arquivoLog(ws, app), 'w')
  const agora = new Date().toISOString()
  try {
    writeSync(fd, `# ${app} · ${c.pasta} · ${agora} · ${autor}\n`)
    const filho = spawn(process.env.DEVMOVE_BASH || 'bash', ['-c', WRAPPER], {
      cwd: ws,
      env: {
        ...process.env,
        ...c.env,
        DEVMOVE_APP_CMD: c.comando,
        DEVMOVE_APP_ANTES: c.antes.join('\n'),
        DEVMOVE_APP_PASTA: c.pasta,
        DEVMOVE_APP_SAIDA: `.devmove/apps/estado/${app}.saida`,
      },
      detached: true,
      stdio: ['ignore', fd, fd],
      windowsHide: true,
    })
    filho.on('error', () => {})
    if (!filho.pid) throw new ErroRunner('bash não encontrado no PATH: o supervisor precisa rodar pelo Git Bash no Windows', 500)
    filho.unref()
    const subida_id = criarSubida(ws, app, autor, agora)
    return gravarEstado(ws, app, { ...PARADA, situacao: 'subindo', pid: filho.pid, iniciada_em: agora, autor, subida_id })
  } finally {
    closeSync(fd)
  }
}

function finalizar(ws: string, app: string, e: EstadoApp, situacao: SituacaoApp, codigo: number | null, erro: string | null): EstadoApp {
  if (e.subida_id) finalizarSubida(ws, e.subida_id, app, situacao, codigo)
  return gravarEstado(ws, app, { ...e, situacao, pid: null, finalizada_em: new Date().toISOString(), codigo_saida: codigo, erro })
}

// No Windows o msys quebra a cadeia de pais (o processo que faz exec morre), então `taskkill /T` no bash
// não alcança o node/java. O grupo de processos do msys guarda todos eles: cada um cai com a árvore nativa.
function pidsDoGrupoMsys(pid: number): number[] {
  try {
    const linhas = execFileSync(process.env.DEVMOVE_BASH || 'bash', ['-c', 'ps'], { encoding: 'utf8', windowsHide: true })
      .split('\n')
      .slice(1)
      .map((l) => l.trim().split(/\s+/))
      .map((c) => (/^\d+$/.test(c[0] ?? '') ? c : c.slice(1)))
      .filter((c) => c.length >= 4)
      .map(([, , pgid, winpid]) => ({ pgid, winpid: Number(winpid) }))
    const raiz = linhas.find((l) => l.winpid === pid)
    return raiz ? linhas.filter((l) => l.pgid === raiz.pgid && l.winpid !== pid).map((l) => l.winpid) : []
  } catch {
    return []
  }
}

// No Unix o processo nasceu líder de grupo (detached), então o sinal vai para o grupo.
function matarArvore(pid: number, forcar: boolean): void {
  if (process.platform === 'win32') {
    for (const alvo of [...pidsDoGrupoMsys(pid), pid]) {
      try {
        execFileSync('taskkill', ['/T', '/F', '/PID', String(alvo)], { stdio: 'ignore', windowsHide: true })
      } catch {
        // já morreu
      }
    }
    return
  }
  const sinal = forcar ? 'SIGKILL' : 'SIGTERM'
  try {
    process.kill(-pid, sinal)
  } catch {
    try {
      process.kill(pid, sinal)
    } catch {
      // já morreu
    }
  }
}

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

export async function parar(ws: string, app: string): Promise<EstadoApp> {
  const e = lerEstado(ws, app)
  if (!e.pid || !vivo(e.pid)) return ativa(e.situacao) ? finalizar(ws, app, e, 'parada', null, null) : e
  gravarEstado(ws, app, { ...e, situacao: 'parando' })
  matarArvore(e.pid, false)
  for (let i = 0; i < 20 && vivo(e.pid); i++) await esperar(500)
  if (vivo(e.pid)) matarArvore(e.pid, true)
  return finalizar(ws, app, e, 'parada', null, null)
}

function portaAberta(porta: number): Promise<boolean> {
  return new Promise((ok) => {
    const s = connect({ port: porta, host: 'localhost', timeout: 1500 })
    const fim = (r: boolean) => {
      s.destroy()
      ok(r)
    }
    s.once('connect', () => fim(true))
    s.once('timeout', () => fim(false))
    s.once('error', () => fim(false))
  })
}

async function respondendo(c: ConfigApp): Promise<boolean> {
  if (c.health) {
    try {
      const r = await fetch(c.health, { signal: AbortSignal.timeout(2000), redirect: 'manual' })
      await r.body?.cancel()
      return r.status < 400
    } catch {
      return false
    }
  }
  if (c.porta) return portaAberta(c.porta)
  return true
}

function codigoSaida(ws: string, app: string): number | null {
  try {
    const n = Number.parseInt(readFileSync(arquivoSaida(ws, app), 'utf8').trim(), 10)
    return Number.isNaN(n) ? null : n
  } catch {
    return null
  }
}

// Confere no host se o processo ainda vive e se já responde. Só roda fora do container.
export async function atualizar(ws: string, c: ConfigApp): Promise<EstadoApp> {
  const e = lerEstado(ws, c.nome)
  if (!e.pid || (e.situacao !== 'subindo' && e.situacao !== 'no_ar')) return e
  if (!vivo(e.pid)) {
    const codigo = codigoSaida(ws, c.nome)
    if (codigo === 0) return finalizar(ws, c.nome, e, 'parada', 0, null)
    return finalizar(ws, c.nome, e, 'falhou', codigo, codigo === null ? 'processo terminou sem código de saída' : `saiu com código ${codigo}`)
  }
  if (e.situacao === 'subindo' && (await respondendo(c))) return gravarEstado(ws, c.nome, { ...e, situacao: 'no_ar' })
  return e
}

export function registrarFalha(ws: string, app: string, erro: string): void {
  const e = lerEstado(ws, app)
  if (!ativa(e.situacao)) gravarEstado(ws, app, { ...e, situacao: 'falhou', pid: null, erro, finalizada_em: new Date().toISOString() })
}

export type Pedido = { app: string; acao: AcaoApp; autor: string; criado_em: string }

const ACOES: AcaoApp[] = ['subir', 'parar', 'reiniciar']

export function pedir(ws: string, app: string, acao: string, autor: string): Pedido {
  if (!ACOES.includes(acao as AcaoApp)) throw new ErroRunner(`ação inválida: ${acao}`)
  configDe(ws, app)
  garantirPastas(ws)
  const p: Pedido = { app, acao: acao as AcaoApp, autor, criado_em: new Date().toISOString() }
  gravarJson(join(pastas(ws).pedidos, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`), p)
  return p
}

// Consome a fila em ordem de chegada; pedido ilegível é descartado.
export function retirarPedidos(ws: string): Pedido[] {
  const dir = pastas(ws).pedidos
  if (!existsSync(dir)) return []
  const r: Pedido[] = []
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const arq = join(dir, f)
    try {
      const p = JSON.parse(readFileSync(arq, 'utf8')) as Pedido
      if (NOME_VALIDO.test(p.app) && ACOES.includes(p.acao)) r.push(p)
    } catch {
      // descartado
    }
    rmSync(arq, { force: true })
  }
  return r
}

type Batimento = { pid: number; visto_em: string }

// O supervisor grava a cada 2s; mais de 6s sem gravar é supervisor desligado.
const VALIDADE_BATIMENTO = 6_000

export function lerBatimento(ws: string): Batimento | null {
  try {
    return JSON.parse(readFileSync(arquivoBatimento(ws), 'utf8')) as Batimento
  } catch {
    return null
  }
}

export function supervisor(ws: string): SupervisorApps {
  const b = lerBatimento(ws)
  return { ligado: !!b && Date.now() - Date.parse(b.visto_em) < VALIDADE_BATIMENTO, visto_em: b?.visto_em ?? null }
}

export function bater(ws: string): void {
  gravarJson(arquivoBatimento(ws), { pid: process.pid, visto_em: new Date().toISOString() } satisfies Batimento)
}
