# Demo: Consultto

Workspace fictício de um SaaS com o DevMove Flow 1.0.0 instalado pelo `setup/lib/instalar.sh` e adaptado como o assistente faria. O código dos serviços foi omitido: o demo mostra o harness e o rastro que ele deixa ao longo do desenvolvimento do produto.

## O produto

Consultto é um SaaS multi-tenant de agenda online e cobrança para clínicas de saúde independentes. Cada clínica é um tenant, com página pública de agendamento, lembretes por WhatsApp e assinatura mensal por plano.

| Serviço | Stack | Agent |
|---|---|---|
| `web` | Next.js 15 | `dev-node` |
| `api` | NestJS 11, Postgres 16 com RLS | `dev-node` |
| `cobranca` | Python 3.12, FastAPI, Celery | `dev-python` |
| `mensageria` | Go 1.23 | `dev-go` |

Parceiros fictícios: PagaFácil (gateway de pagamento) e ZapConnect (WhatsApp).

## Histórico do produto

| Demanda | Porte | O que mostra |
|---|---|---|
| `2026-08-04-lembrete-consulta-whatsapp` | M | Duas frentes em paralelo (api e mensageria). O revisor-code pega um job sem contexto de tenant, e a correção sai automática por `SendMessage`. No fechamento, uma hipótese vira lei (L2 multi-tenancy). |
| `2026-08-19-renomear-medico-profissional` | P | Rename com de-para, símbolo mantido na API pública e gate de porte junto com o do plano. |
| `2026-09-01-planos-assinatura` | G | Etapas completas, com ajuste pedido pela Ana no técnico e fallback no plano (causa: critério). Um dev para no ponto de bastão, e a continuação parte da passagem. Gera lei nova e um entregável para a diretoria. |
| `2026-09-20-lista-de-espera` | G | Travada no fallback da execução. F2 depende de template aprovado no provedor (causa: informação), enquanto F1 e F3 já foram aprovadas. |

## O que olhar

| Onde | Mostra |
|---|---|
| `CLAUDE.md`, `.claude/` | Harness adaptado: um `dev-<stack>` por stack e hook de lint para TypeScript e Go. |
| `doc/produtos/` | Regras que atravessam serviços: multi-tenancy, agenda, assinatura, lembretes. Leis com rastro de promoção, fatos com data, hipótese rejeitada. |
| `doc/servicos/*/mapa.md` | Mapa de código de cada serviço, mantido pelo arquivista. |
| `doc/demandas/*/CHANGELOG.md` | Estado e cada passagem, com tokens e chamadas por agent. |
| `doc/demandas/*/mapa.md` | O que os agents descobriram e compartilharam dentro da demanda. |
| `doc/demandas/*/passagem/` | O que um dev deixou para o próximo no ponto de bastão. |
| `doc/entregaveis/` | Documento para a diretoria, com estado por capacidade. |
| `.claude/retro.md` | Três retros, cada uma com o ajuste proposto ao harness. |

## Como ler uma demanda

1. `CHANGELOG.md`: o `Estado` diz onde a demanda está, e o `Registro` conta a história.
2. `negocio.md` → `tecnico.md` → `plano.md` → `testes.md`: cada um com uma função e dentro do teto de linhas.
3. `mapa.md` e `passagem/`: a memória compartilhada entre agents.

## Experimentar

Abra o Claude Code nesta pasta e rode:
- `/retomar 2026-09-20-lista-de-espera` para ver o gate de fallback;
- `/demanda <relato>` para abrir uma demanda nova.

Sem código em `code/`, a execução para com bloqueio, mas o refinamento e o plano rodam inteiros.
