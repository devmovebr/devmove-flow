export const migracoes: { versao: number; sql: string }[] = [
  {
    versao: 1,
    sql: `
      create table rodadas (
        id integer primary key,
        dossie text not null,
        ambiente text not null,
        origem text not null,
        autor text not null,
        status text not null,
        iniciada_em text not null,
        finalizada_em text
      );
      create table execucoes (
        id integer primary key,
        rodada_id integer not null references rodadas(id),
        cenario text not null,
        titulo text not null,
        ordem integer not null,
        cenario_md text not null,
        request json not null,
        resposta json,
        erro text,
        assercoes json not null,
        veredito text not null,
        veredito_auto text not null,
        nota text,
        executada_em text not null
      );
      create index rodadas_dossie on rodadas(dossie, id);
      create index execucoes_rodada on execucoes(rodada_id, ordem);
    `,
  },
  {
    // Cobre placar, estado atual e histórico sem ler a linha inteira: veredito e executada_em vêm depois dos JSON grandes.
    versao: 2,
    sql: 'create index execucoes_cenario on execucoes(rodada_id, cenario, executada_em, veredito);',
  },
]
