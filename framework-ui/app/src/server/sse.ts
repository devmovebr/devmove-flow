import type { FastifyReply } from 'fastify'

export function abrirSse(reply: FastifyReply): (evento: string, dados: unknown) => void {
  reply.hijack()
  reply.raw.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
  return (evento, dados) => reply.raw.write(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`)
}
