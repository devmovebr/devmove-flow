import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { ErroRunner } from '../erros.ts'
import { arquivoLogSupervisor } from './config.ts'
import { supervisor } from './processo.ts'

// Um registro por cópia, sem admin: pasta Inicializar no Windows, unidade de usuário do systemd no Linux,
// agente do launchd no macOS. O hash do caminho separa duas cópias com o mesmo nome de pasta.
// Só a saída com erro religa o supervisor: o `tools/apps.sh desligar` encerra com código 0 e ele fica desligado.
const id = (ws: string) =>
  `devmove-apps-${basename(ws).replace(/[^A-Za-z0-9_-]/g, '-')}-${createHash('sha1').update(ws).digest('hex').slice(0, 6)}`

type Registro = { arquivo: string; conteudo: string; ativar: () => void; desativar: () => void }

const silencioso = (cmd: string, args: string[]) => {
  try {
    execFileSync(cmd, args, { stdio: 'ignore' })
  } catch {
    // não estava registrado
  }
}

// C:\a\b → /c/a/b, o caminho que o bash do Git entende.
const caminhoMsys = (p: string) => p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d: string) => `/${d.toLowerCase()}`)

function windows(ws: string): Registro {
  const bash = process.env.DEVMOVE_BASH
  if (!bash || !process.env.APPDATA) throw new ErroRunner('rode pelo tools/apps.sh no Git Bash: falta o caminho do bash')
  const arquivo = join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', `${id(ws)}.cmd`)
  const conteudo = [
    '@echo off',
    'chcp 65001 >nul',
    `rem Gerado por tools/apps.sh inicializacao. Liga no logon o supervisor das aplicações de ${ws}.`,
    `start "" /min "${bash}" -lc "cd '${caminhoMsys(ws)}' && tools/apps.sh ligar"`,
    '',
  ].join('\r\n')
  return { arquivo, conteudo, ativar: () => {}, desativar: () => {} }
}

function linux(ws: string): Registro {
  const nome = `${id(ws)}.service`
  const conteudo = `# Gerado por tools/apps.sh inicializacao.
[Unit]
Description=DevMove Flow: supervisor das aplicações de ${ws}

[Service]
WorkingDirectory=${ws}
Environment=PATH=${process.env.PATH ?? ''}
ExecStart=/usr/bin/env bash ${ws}/tools/apps.sh supervisor
Restart=on-failure
RestartSec=10
StandardOutput=append:${arquivoLogSupervisor(ws)}
StandardError=append:${arquivoLogSupervisor(ws)}

[Install]
WantedBy=default.target
`
  return {
    arquivo: join(homedir(), '.config', 'systemd', 'user', nome),
    conteudo,
    ativar: () => {
      execFileSync('systemctl', ['--user', 'daemon-reload'], { stdio: 'inherit' })
      execFileSync('systemctl', ['--user', 'enable', '--now', nome], { stdio: 'inherit' })
    },
    desativar: () => {
      silencioso('systemctl', ['--user', 'disable', '--now', nome])
      silencioso('systemctl', ['--user', 'daemon-reload'])
    },
  }
}

function macos(ws: string): Registro {
  const rotulo = `br.devmove.${id(ws)}`
  const arquivo = join(homedir(), 'Library', 'LaunchAgents', `${rotulo}.plist`)
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const conteudo = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- Gerado por tools/apps.sh inicializacao. -->
<plist version="1.0">
<dict>
  <key>Label</key><string>${rotulo}</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>${esc(ws)}/tools/apps.sh</string><string>supervisor</string></array>
  <key>WorkingDirectory</key><string>${esc(ws)}</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>${esc(process.env.PATH ?? '')}</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>StandardOutPath</key><string>${esc(arquivoLogSupervisor(ws))}</string>
  <key>StandardErrorPath</key><string>${esc(arquivoLogSupervisor(ws))}</string>
</dict>
</plist>
`
  return {
    arquivo,
    conteudo,
    ativar: () => execFileSync('launchctl', ['load', '-w', arquivo], { stdio: 'inherit' }),
    desativar: () => silencioso('launchctl', ['unload', '-w', arquivo]),
  }
}

function registro(ws: string): Registro {
  if (process.platform === 'win32') return windows(ws)
  if (process.platform === 'darwin') return macos(ws)
  return linux(ws)
}

// Idempotente: roda em todo `devmove-ui.sh atualizar`. Registro igual e supervisor de pé não mexe em nada.
// `desligar` recebe o supervisor avulso antes de o serviço assumir, para não haver dois.
export function instalarInicializacao(ws: string, desligar: () => void, ligar: () => void): string {
  const r = registro(ws)
  const igual = existsSync(r.arquivo) && readFileSync(r.arquivo, 'utf8') === r.conteudo
  if (igual && supervisor(ws).ligado) return `inicialização em dia: ${r.arquivo}`
  mkdirSync(join(r.arquivo, '..'), { recursive: true })
  writeFileSync(r.arquivo, r.conteudo)
  if (process.platform === 'win32') ligar()
  else {
    desligar()
    r.desativar()
    r.ativar()
  }
  return `inicialização registrada: ${r.arquivo}`
}

export function removerInicializacao(ws: string): string {
  const r = registro(ws)
  if (!existsSync(r.arquivo)) return 'inicialização não estava registrada'
  r.desativar()
  rmSync(r.arquivo, { force: true })
  return process.platform === 'win32'
    ? `inicialização removida: ${r.arquivo} (o supervisor atual segue até tools/apps.sh desligar)`
    : `inicialização removida e supervisor desligado: ${r.arquivo}`
}

export function statusInicializacao(ws: string): string {
  const r = registro(ws)
  return existsSync(r.arquivo) ? `inicialização registrada: ${r.arquivo}` : 'inicialização não registrada (tools/apps.sh inicializacao instalar)'
}
