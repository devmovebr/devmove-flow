import { existsSync, statSync } from 'node:fs'
import type { FastifyInstance } from 'fastify'
import type { PainelApps, Subida } from '../shared/tipos.ts'
import { inicioDaCauda, lerTrecho } from '../runner/arquivos.ts'
import { arquivoLog, configDe } from '../runner/apps/config.ts'
import { painelApps } from '../runner/apps/painel.ts'
import { pedir } from '../runner/apps/processo.ts'
import { subidas } from '../runner/apps/subidas.ts'
import { abrirSse } from './sse.ts'

const CAUDA_INICIAL = 256 * 1024

// Spring, Nest e companhia colorem o console; o painel desenha o próprio destaque por nível.
// oxlint-disable-next-line no-control-regex
const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g

const linhas = (texto: string) =>
  texto
    .replace(ANSI, '')
    .split('\n')
    .slice(0, -1)
    .map((l) => l.replace(/\r$/, ''))

// Cada subida renomeia o log e cria outro: a identidade do arquivo muda mesmo que o tamanho já tenha passado do lido.
const identidade = (arq: string) => {
  const st = statSync(arq)
  return `${st.ino}:${st.birthtimeMs}`
}

function lerCauda(arq: string): { linhas: string[]; ate: number; cortado: boolean } {
  if (!existsSync(arq)) return { linhas: [], ate: 0, cortado: false }
  const de = inicioDaCauda(arq, CAUDA_INICIAL)
  const t = lerTrecho(arq, de)
  return { linhas: linhas(t.texto), ate: t.ate, cortado: de > 0 }
}

export function registrarApps(app: FastifyInstance, projeto: (p: string) => string, usuario: string): void {
  app.get<{ Params: { p: string } }>('/api/projetos/:p/apps', async (req): Promise<PainelApps> => painelApps(projeto(req.params.p), true))

  app.post<{ Params: { p: string; app: string; acao: string } }>('/api/projetos/:p/apps/:app/:acao', async (req, reply) => {
    const pedido = pedir(projeto(req.params.p), req.params.app, req.params.acao, usuario)
    return reply.status(202).send(pedido)
  })

  app.get<{ Params: { p: string; app: string } }>('/api/projetos/:p/apps/:app/subidas', async (req): Promise<Subida[]> => {
    const ws = projeto(req.params.p)
    configDe(ws, req.params.app)
    return subidas(ws, req.params.app)
  })

  app.get<{ Params: { p: string; app: string } }>('/api/projetos/:p/apps/:app/log/anterior', async (req) => {
    const ws = projeto(req.params.p)
    configDe(ws, req.params.app)
    return lerCauda(arquivoLog(ws, req.params.app, true))
  })

  // O supervisor só acrescenta; polling de 1s como nos logs de agentes (fs.watch não dispara em volume montado).
  // `inicio` traz a cauda do arquivo e é reenviado quando uma nova subida recria o log.
  app.get<{ Params: { p: string; app: string } }>('/api/projetos/:p/apps/:app/log', (req, reply) => {
    const ws = projeto(req.params.p)
    configDe(ws, req.params.app)
    const arq = arquivoLog(ws, req.params.app)
    const enviar = abrirSse(reply)
    let id = existsSync(arq) ? identidade(arq) : ''
    let { ate, ...cauda } = lerCauda(arq)
    enviar('inicio', cauda)
    const ler = () => {
      if (!existsSync(arq)) return
      const atual = identidade(arq)
      const t = atual === id ? lerTrecho(arq, ate) : { texto: '', ate: -1 }
      if (t.ate < 0) {
        id = atual
        ;({ ate, ...cauda } = lerCauda(arq))
        enviar('inicio', cauda)
      } else if (t.texto) {
        ate = t.ate
        enviar('linhas', linhas(t.texto))
      }
    }
    // Uma nova subida renomeia e recria o log entre o existsSync e a leitura: a próxima volta pega o arquivo novo.
    const leitura = setInterval(() => {
      try {
        ler()
      } catch {
        // log trocado no meio da leitura
      }
    }, 1_000)
    const pulso = setInterval(() => reply.raw.write(': pulso\n\n'), 15_000)
    req.raw.on('close', () => {
      clearInterval(leitura)
      clearInterval(pulso)
    })
  })
}
