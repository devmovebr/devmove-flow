# DevMove Painel

Interface do harness. Módulo atual: Testes (demandas, suítes do `plano-teste.md`, rodadas e reteste manual). Especificação em `SPEC.md`. Referências visuais em `referencias/`.

## Subir na VM

```bash
cd framework-ui
DEVMOVE_WORKSPACES=/caminho/da/pasta/com/as/copias docker compose up -d --build
```

Abre em `http://localhost:4800`. Cada subpasta com `CLAUDE.md`, `devmove-valores.md` e `doc/demandas/` vira um projeto. O banco fica em `<cópia>/.devmove/devmove.db`.

## Desenvolver

```bash
cd framework-ui/app
npm run dev        # API em 4800 e Vite em 5173
npm run dev:mock   # API simulada da Consultto em 4000, para o demo (POST /dev/reset volta a massa)
npm run build:cli  # regera tools/qa.mjs no framework e no demo
```

Mudou o runner: rode `build:cli` e versione o `framework/tools/qa.mjs`.
