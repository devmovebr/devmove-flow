import { relative } from 'node:path'
import type { Assercao, Execucao, Placar } from '../shared/tipos.ts'
import { repositorio } from './banco.ts'
import { dataCurta, segundos } from './evidencia.ts'
import { iniciarRodada, mudarVeredito } from './executor.ts'
import { acharWorkspace, lerSuite, normalizarDossie, pastaDossie } from './workspaces.ts'

const USO = `Uso: tools/qa.sh <comando> <dossiê> [args]
  validar <dossiê>
  run <dossiê> <ambiente> [T1,T3] [--autor nina-qa]
  veredito <dossiê> <ambiente> <Tn> <PASSOU|FALHOU|BLOQUEADO|PENDENTE> "<nota>"
  rodadas <dossiê>
<dossiê>: qa/<slug> ou doc/demandas/qa/<slug>`

function sair(msg: string, codigo = 2): never {
  console.error(msg)
  process.exit(codigo)
}

function curto(texto: string): string {
  return texto.replace(/`/g, '').replace(/\[\?\(.*?\)\]/g, '[...]')
}

function falhas(a: Assercao[]): string {
  return a
    .filter((x) => x.tipo === 'auto' && x.ok === false)
    .map((x) => `${curto(x.texto)} (obtido ${x.obtido === undefined ? 'nada' : JSON.stringify(x.obtido)})`)
    .join('; ')
}

function linhaExecucao(e: Execucao): string {
  const partes = [e.cenario, e.veredito]
  if (e.resposta) partes.push(String(e.resposta.status), segundos(e.resposta.tempo_ms))
  if (e.erro) partes.push(`erro: ${e.erro}`)
  const f = falhas(e.assercoes)
  if (f) partes.push(f)
  const manuais = e.assercoes.filter((a) => a.tipo === 'manual').length
  if (e.veredito === 'PENDENTE' && manuais) partes.push(`${manuais} asserção(ões) manual(is)`)
  return partes.join(' ')
}

function placarTexto(p: Placar): string {
  return `${p.passou} passou, ${p.falhou} falhou, ${p.pendente} pendente, ${p.bloqueado} bloqueado, ${p.nao_executado} não executado`
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  let autor = 'nina-qa'
  const pos: string[] = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--autor') autor = args[++i] ?? sair('--autor sem valor')
    else if (args[i].startsWith('--autor=')) autor = args[i].slice(8)
    else if (args[i] === '-h' || args[i] === '--help') sair(USO, 0)
    else pos.push(args[i])
  }
  const [comando, dossieArg] = pos
  if (!comando || !dossieArg) sair(USO)
  const ws = acharWorkspace(process.cwd()) ?? sair('workspace não encontrado (pasta com CLAUDE.md e doc/demandas/)')
  const dossie = normalizarDossie(dossieArg)

  let suite
  try {
    suite = lerSuite(ws, dossie)
  } catch (e) {
    sair((e as Error).message)
  }

  if (comando === 'validar') {
    let erros = 0
    if (!suite.cenarios.length) {
      console.log('plano sem cenários (### T<n> <título> dentro de ## Cenários)')
      erros++
    }
    for (const c of suite.cenarios) {
      if (!c.erros.length) console.log(`${c.id} ok ${c.titulo}`)
      for (const e of c.erros) console.log(`${c.id} erro: ${e}`)
      erros += c.erros.length
    }
    console.log(erros ? `${erros} erro(s)` : `${suite.cenarios.length} cenário(s) válidos`)
    process.exit(erros ? 1 : 0)
  }

  if (comando === 'run') {
    const [, , amb, lista] = pos
    if (!amb) sair(USO)
    const ctrl = new AbortController()
    process.on('SIGINT', () => ctrl.abort())
    let r
    try {
      r = iniciarRodada({
        ws,
        dossie,
        ambiente: amb,
        cenarios: lista ? lista.split(',').filter(Boolean) : undefined,
        autor,
        sinal: ctrl.signal,
        aoExecutar: (e) => console.log(linhaExecucao(e)),
        aoPular: (c) => console.log(`${c.id} NAO_EXECUTADO plano com erro: ${c.erros.join('; ')}`),
      })
    } catch (e) {
      sair((e as Error).message)
    }
    const rodada = await r.fim
    const evid = relative(ws, `${pastaDossie(ws, dossie)}/evidencias/${amb}.md`)
    console.log(`rodada #${rodada.id} ${rodada.status} · ${placarTexto(rodada.placar)} · ${evid}`)
    return
  }

  if (comando === 'veredito') {
    const [, , amb, cen, veredito, nota] = pos
    if (!amb || !cen || !veredito) sair(USO)
    const e = repositorio(ws).ultimaExecucao(dossie, amb, cen.toUpperCase())
    if (!e) sair(`nenhuma execução de ${cen} em ${amb}`)
    try {
      const nova = mudarVeredito(ws, e.id, veredito, nota ?? null)
      console.log(`${nova.cenario} ${nova.veredito} (automático: ${nova.veredito_auto}) · rodada #${nova.rodada_id}${nova.nota ? ` · nota: ${nova.nota}` : ''}`)
    } catch (err) {
      sair((err as Error).message)
    }
    return
  }

  if (comando === 'rodadas') {
    const rodadas = repositorio(ws).rodadas(dossie, suite.cenarios.length)
    if (!rodadas.length) console.log('nenhuma rodada')
    for (const r of rodadas) {
      console.log(`#${r.id} ${r.ambiente} ${r.origem} ${r.autor} ${r.status} ${dataCurta(r.iniciada_em)} · ${placarTexto(r.placar)}`)
    }
    return
  }

  sair(USO)
}

main().catch((e) => sair(`erro: ${(e as Error).message}`, 1))
