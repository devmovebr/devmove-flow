import { rmSync } from 'node:fs'
import { ErroRunner } from '../erros.ts'
import { arquivoBatimento, type ConfigApp, garantirPastas, lerConfig } from './config.ts'
import { atualizar, bater, lerBatimento, lerEstado, type Pedido, parar, registrarFalha, retirarPedidos, subir, supervisor, vivo } from './processo.ts'

async function executar(ws: string, p: Pedido): Promise<void> {
  if (p.acao !== 'subir') await parar(ws, p.app)
  if (p.acao !== 'parar') subir(ws, p.app, p.autor)
}

// Laço do host: atende a fila da UI, confere processo e health das apps e grava o batimento.
// As apps não são filhas dele: se o supervisor cair, elas seguem e são retomadas pelo pid gravado.
export async function supervisionar(ws: string, log: (msg: string) => void): Promise<never> {
  const outro = lerBatimento(ws)
  if (outro && outro.pid !== process.pid && supervisor(ws).ligado && vivo(outro.pid)) throw new ErroRunner(`supervisor já ligado (pid ${outro.pid})`)
  garantirPastas(ws)
  const sair = () => {
    rmSync(arquivoBatimento(ws), { force: true })
    process.exit(0)
  }
  process.on('SIGINT', sair)
  process.on('SIGTERM', sair)

  // Ações da mesma app em fila; apps diferentes andam em paralelo.
  const filas = new Map<string, Promise<void>>()
  const ocupadas = new Set<string>()
  const enfileirar = (app: string, tarefa: () => Promise<void>) => {
    ocupadas.add(app)
    const fila = (filas.get(app) ?? Promise.resolve()).then(tarefa).finally(() => {
      if (filas.get(app) === fila) {
        filas.delete(app)
        ocupadas.delete(app)
      }
    })
    filas.set(app, fila)
  }

  log(`supervisor ligado em ${ws} (pid ${process.pid})`)
  let tique = 0
  let erroConfig = ''
  for (;;) {
    if (tique++ % 2 === 0) bater(ws)
    for (const p of retirarPedidos(ws)) {
      log(`${p.acao} ${p.app} por ${p.autor}`)
      enfileirar(p.app, () =>
        executar(ws, p).catch((e: Error) => {
          log(`${p.acao} ${p.app} falhou: ${e.message}`)
          registrarFalha(ws, p.app, e.message)
        }),
      )
    }
    let config: ConfigApp[] = []
    try {
      config = lerConfig(ws)
      erroConfig = ''
    } catch (e) {
      if ((e as Error).message !== erroConfig) log((erroConfig = (e as Error).message))
    }
    for (const c of config) {
      if (ocupadas.has(c.nome)) continue
      enfileirar(c.nome, async () => {
        const antes = lerEstado(ws, c.nome).situacao
        const depois = (await atualizar(ws, c)).situacao
        if (antes !== depois) log(`${c.nome}: ${antes} → ${depois}`)
      })
    }
    await new Promise((ok) => setTimeout(ok, 1_000))
  }
}
