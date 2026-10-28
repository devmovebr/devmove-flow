import { spawn } from 'node:child_process'
import { closeSync, existsSync, openSync, readFileSync, rmSync, statSync } from 'node:fs'
import { relative } from 'node:path'
import type { App } from '../../shared/tipos.ts'
import { lerTrecho } from '../arquivos.ts'
import { acharWorkspace } from '../workspaces.ts'
import { arquivoBatimento, arquivoConfig, arquivoLog, arquivoLogSupervisor, configDe, garantirPastas, lerConfig } from './config.ts'
import { painelApps } from './painel.ts'
import { atualizar, lerBatimento, lerEstado, parar, subir, supervisor, vivo } from './processo.ts'
import { adicionarRepo, listarRepos } from './repos.ts'
import { instalarInicializacao, removerInicializacao, statusInicializacao } from './inicializacao.ts'
import { supervisionar } from './supervisor.ts'

const USO = `Uso: tools/apps.sh <comando> [args]
  listar
  up <app> [--sem-esperar] [--esperar <s>]   sobe e espera ficar no ar (padrão 300s)
  down <app>
  restart <app> [--sem-esperar]
  logs <app> [-f] [-n <linhas>] [--anterior]
  supervisor                                atende a UI em primeiro plano
  ligar | desligar                          supervisor em segundo plano
  inicializacao <instalar|remover|status>   supervisor ligado junto com a máquina
  repo adicionar <pasta> <url>               clona em code/, registra no repos.txt (commit) e no banco
  repo listar
Apps em tools/.local/apps.json (gerado pelo /apps).`

function sair(msg: string, codigo = 2): never {
  console.error(msg)
  process.exit(codigo)
}

const autor = () => process.env.DEVMOVE_USUARIO || process.env.USER || process.env.USERNAME || 'pessoa'
const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

function duracao(desde: string | null): string {
  if (!desde) return ''
  const s = Math.max(0, Math.round((Date.now() - Date.parse(desde)) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}min`
  return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`
}

function linhaApp(a: App): string {
  const partes = [a.nome.padEnd(16), a.situacao.padEnd(8)]
  if (a.pid) partes.push(`pid ${a.pid}`)
  if (a.porta) partes.push(`porta ${a.porta}`)
  if (a.situacao === 'subindo' || a.situacao === 'no_ar') partes.push(`há ${duracao(a.iniciada_em)}`)
  if (a.erro) partes.push(a.erro)
  if (a.repo !== a.nome) partes.push(`repo ${a.repo}`)
  return partes.join(' · ')
}

function cauda(arq: string, linhas: number): string[] {
  if (!existsSync(arq)) return []
  return readFileSync(arq, 'utf8').trimEnd().split('\n').slice(-linhas)
}

async function acompanhar(arq: string): Promise<never> {
  let ate = existsSync(arq) ? statSync(arq).size : 0
  for (;;) {
    if (existsSync(arq)) {
      const t = lerTrecho(arq, ate)
      if (t.ate < 0) ate = 0
      else {
        process.stdout.write(t.texto)
        ate = t.ate
      }
    }
    await esperar(500)
  }
}

async function upEsperando(ws: string, app: string, limite: number): Promise<void> {
  const c = configDe(ws, app)
  subir(ws, app, autor())
  console.log(`${app} subindo · log em ${relative(ws, arquivoLog(ws, app))}`)
  if (!limite) return
  const fim = Date.now() + limite * 1000
  let e = lerEstado(ws, app)
  while (e.situacao === 'subindo' && Date.now() < fim) {
    await esperar(1000)
    e = await atualizar(ws, c)
  }
  if (e.situacao === 'no_ar') return console.log(`${app} no ar · pid ${e.pid}${c.porta ? ` · porta ${c.porta}` : ''} · ${duracao(e.iniciada_em)}`)
  if (e.situacao === 'subindo') sair(`${app} ainda subindo após ${limite}s (segue rodando; tools/apps.sh logs ${app})`, 1)
  console.error(cauda(arquivoLog(ws, app), 30).join('\n'))
  sair(`${app} ${e.situacao}${e.erro ? `: ${e.erro}` : ''}`, 1)
}

function ligar(ws: string): void {
  const s = supervisor(ws)
  const b = lerBatimento(ws)
  if (s.ligado && b && vivo(b.pid)) return console.log(`supervisor já ligado (pid ${b.pid})`)
  garantirPastas(ws)
  const fd = openSync(arquivoLogSupervisor(ws), 'a')
  const filho = spawn(process.execPath, [...process.execArgv, process.argv[1], 'supervisor'], {
    cwd: ws,
    detached: true,
    stdio: ['ignore', fd, fd],
    windowsHide: true,
  })
  closeSync(fd)
  filho.unref()
  console.log(`supervisor ligado (pid ${filho.pid}) · log em ${relative(ws, arquivoLogSupervisor(ws))}`)
}

function desligar(ws: string): void {
  const b = lerBatimento(ws)
  if (b && vivo(b.pid)) {
    try {
      process.kill(b.pid)
    } catch {
      // já morreu
    }
  }
  rmSync(arquivoBatimento(ws), { force: true })
  console.log(b ? `supervisor desligado (pid ${b.pid}); as apps seguem rodando` : 'supervisor não estava ligado')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (!args.length || args[0] === '-h' || args[0] === '--help') sair(USO, args.length ? 0 : 2)
  const ws = acharWorkspace(process.cwd()) ?? sair('workspace não encontrado (pasta com CLAUDE.md e doc/demandas/)')
  const flag = (nome: string) => args.includes(nome)
  const valor = (nome: string) => {
    const i = args.indexOf(nome)
    return i >= 0 ? args[i + 1] : undefined
  }
  const [comando, alvo] = args

  switch (comando) {
    case 'listar': {
      const atual = painelApps(ws, false)
      if (atual.erro_config) sair(atual.erro_config)
      for (const c of lerConfig(ws)) Object.assign(atual.apps.find((a) => a.nome === c.nome)!, await atualizar(ws, c))
      if (!atual.apps.length) console.log(`nenhuma app em ${relative(ws, arquivoConfig(ws))}: rode /apps no Claude Code`)
      for (const a of atual.apps) console.log(linhaApp(a))
      for (const r of atual.repos_sem_app) console.log(`${r.nome.padEnd(16)} · sem roteiro de subida${r.clonado ? '' : ' · não clonado'}`)
      console.log(`supervisor ${atual.supervisor.ligado ? 'ligado' : 'desligado (tools/apps.sh ligar)'}`)
      return
    }
    case 'up':
    case 'restart': {
      if (!alvo) sair(USO)
      if (comando === 'restart') await parar(ws, alvo)
      const limite = flag('--sem-esperar') ? 0 : Number(valor('--esperar') ?? 300)
      return upEsperando(ws, alvo, limite)
    }
    case 'down': {
      if (!alvo) sair(USO)
      configDe(ws, alvo)
      const e = await parar(ws, alvo)
      return console.log(`${alvo} ${e.situacao}`)
    }
    case 'logs': {
      if (!alvo) sair(USO)
      configDe(ws, alvo)
      const arq = arquivoLog(ws, alvo, flag('--anterior'))
      const linhas = cauda(arq, Number(valor('-n') ?? 200))
      if (linhas.length) console.log(linhas.join('\n'))
      else if (!flag('-f')) console.log(`sem log de ${alvo}`)
      if (flag('-f')) await acompanhar(arq)
      return
    }
    case 'supervisor':
      await supervisionar(ws, (msg) => console.log(`${new Date().toISOString()} ${msg}`))
      return
    case 'ligar':
      return ligar(ws)
    case 'desligar':
      return desligar(ws)
    case 'inicializacao': {
      if (alvo === 'instalar') return console.log(instalarInicializacao(ws, () => desligar(ws), () => ligar(ws)))
      if (alvo === 'remover') return console.log(removerInicializacao(ws))
      if (alvo === 'status') return console.log(statusInicializacao(ws))
      sair(USO)
    }
    case 'repo': {
      if (alvo === 'listar') {
        const config = (() => {
          try {
            return lerConfig(ws)
          } catch {
            return []
          }
        })()
        const repos = listarRepos(ws, config, false)
        if (!repos.length) console.log('nenhum repositório em tools/repos.txt')
        for (const r of repos)
          console.log(`${r.nome.padEnd(16)} · ${r.clonado ? 'clonado' : 'não clonado'} · ${r.apps.length ? `apps: ${r.apps.join(', ')}` : 'sem roteiro de subida'} · ${r.url}`)
        return
      }
      if (alvo === 'adicionar') {
        const [, , nome, url] = args
        if (!nome || !url) sair(USO)
        adicionarRepo(ws, nome, url, console.log)
        return console.log(`pronto. A UI registra no banco ao abrir Aplicações; para subir: /apps ${nome} no Claude Code`)
      }
      sair(USO)
    }
  }
  sair(USO)
}

main().catch((e) => sair(`erro: ${(e as Error).message}`, 1))
