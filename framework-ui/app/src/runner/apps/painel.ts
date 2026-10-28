import type { App, PainelApps } from '../../shared/tipos.ts'
import { type ConfigApp, lerConfig } from './config.ts'
import { lerEstado, supervisor } from './processo.ts'
import { listarRepos } from './repos.ts'

export const appDe = (ws: string, c: ConfigApp): App => ({
  nome: c.nome,
  repo: c.repo,
  pasta: c.pasta,
  comando: c.comando,
  porta: c.porta,
  health: c.health,
  ...lerEstado(ws, c.nome),
})

export function painelApps(ws: string, espelhar: boolean): PainelApps {
  let config: ConfigApp[] = []
  let erro_config: string | null = null
  try {
    config = lerConfig(ws)
  } catch (e) {
    erro_config = (e as Error).message
  }
  return {
    supervisor: supervisor(ws),
    apps: config.map((c) => appDe(ws, c)),
    repos_sem_app: listarRepos(ws, config, espelhar).filter((r) => !r.apps.length),
    erro_config,
  }
}
