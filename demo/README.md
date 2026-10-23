# Demo: Consultto

Workspace fictício de um SaaS com o DevMove Flow instalado pelo `setup/lib/instalar.sh` (valores em `devmove-valores.md`) e atualizado para a 2.0.0. O código dos serviços foi omitido: o demo mostra o harness e o rastro que ele deixa ao longo do desenvolvimento do produto.

## O produto

Consultto é um SaaS multi-tenant de agenda online e cobrança para clínicas de saúde independentes. Cada clínica é um tenant, com página pública de agendamento, lembretes por WhatsApp e assinatura mensal por plano.

| Serviço | Stack | Agent |
|---|---|---|
| `web` | Next.js 15 | `allan-dev-node` |
| `api` | NestJS 11, Postgres 16 com RLS | `allan-dev-node` |
| `cobranca` | Python 3.12, FastAPI, Celery | `sam-dev-python` |
| `mensageria` | Go 1.23 | `greg-dev-go` |

Parceiros fictícios: PagaFácil (gateway de pagamento) e ZapConnect (WhatsApp).

## Histórico do produto

| Demanda | Tipo · porte | O que mostra |
|---|---|---|
| `feature/2026-08-04-lembrete-consulta-whatsapp` | feature · M | Duas frentes em paralelo (api e mensageria). A revisão de código pega um job sem contexto de tenant, e a correção sai automática por `SendMessage`. No fechamento, uma hipótese vira lei (L2 multi-tenancy). |
| `debito-tecnico/2026-08-19-renomear-medico-profissional` | débito · P | Rename com de-para, símbolo mantido na API pública e gate de porte junto com o do plano. |
| `feature/2026-09-01-planos-assinatura` | feature · G | Etapas completas, com ajuste pedido pela Ana no técnico e fallback no plano (causa: critério). Um dev para no ponto de bastão, e a continuação parte da passagem. Gera lei nova e um entregável para a diretoria. |
| `qa/2026-09-14-planos-assinatura-staging` | QA | Plano de teste aprovado, evidência colável com `$BASE` e `$TOKEN`, parecer reprovado em 1 de 6 cenários. |
| `bug/2026-09-15-ajuste-troca-plano-arredonda-para-cima` | bug · P | Nasce do parecer de QA. Plano com reprodução, causa e aceite de regressão; branch e commit pelo orquestrador; retornos em `passagem/`. |
| `feature/2026-09-20-lista-de-espera` | feature · G | Travada no fallback da execução. F2 depende de template aprovado no provedor (causa: informação), enquanto F1 e F3 já foram aprovadas. |
| `feature/2026-09-26-remarcacao-pelo-paciente` | feature · M | Validação de reclassificação de porte; depende da lista de espera. |
| `debito-tecnico/2026-09-27-remover-consulta-cancelada-v1` | débito · backlog | "Fora de escopo encontrado" que virou débito num gate e espera priorização. |

## O que olhar

| Onde | Mostra |
|---|---|
| `CLAUDE.md`, `.claude/` | Harness adaptado: agents com apelido, um dev por stack, rule por serviço em `rules/code/servicos/` e hook de lint para TypeScript e Go. |
| `tools/` | Banco local e token de QA, únicos caminhos dos agents até esses recursos. |
| `doc/integracoes/`, `doc/arquitetura/` | Contrato e fatos dos parceiros; ambientes e autenticação. |
| `doc/produtos/` | Regras que atravessam serviços: multi-tenancy, agenda, assinatura, lembretes. Leis com rastro de promoção, fatos com data, hipótese rejeitada. |
| `doc/servicos/*/mapa.md` | Mapa de código de cada serviço, mantido pelo arquivista. |
| `doc/demandas/<tipo>/` | Uma pasta por tipo (feature, bug, débito técnico, QA), cada uma com seu INDEX. |
| `doc/demandas/*/*/CHANGELOG.md` | Estado e cada passagem, com tokens e chamadas por agent. |
| `doc/demandas/*/*/mapa.md` | O que os agents descobriram e compartilharam dentro da demanda. |
| `doc/demandas/*/*/passagem/` | Bastão e retornos gravados pelos agents. |
| `doc/entregaveis/` | Documento para a diretoria, com estado por capacidade. |
| `.claude/retro.md` | Uma linha por demanda, cada uma com o ajuste proposto ao harness. |

## Como ler uma demanda

1. `CHANGELOG.md`: o `Estado` diz onde a demanda está, e o `Registro` conta a história.
2. `negocio.md` → `tecnico.md` → `plano.md` → `testes.md`: cada um com uma função e dentro do teto de linhas.
3. `mapa.md` e `passagem/`: a memória compartilhada entre agents.

## Experimentar

Abra o Claude Code nesta pasta e rode:
- `/retomar 2026-09-20-lista-de-espera` para ver o gate de fallback;
- `/retomar 2026-09-27-remover-consulta-cancelada-v1` para priorizar um débito do backlog;
- `/brief` para ver andamento, backlog e QA;
- `/demanda <relato>` para abrir uma demanda nova.

Sem código em `code/`, a execução para com bloqueio, mas o refinamento e o plano rodam inteiros.
