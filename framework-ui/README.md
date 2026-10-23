# DevMove Flow UI

Interface do harness. Módulo atual: Testes (demandas, suítes do `plano-teste.md`, rodadas e reteste manual). Especificação em `SPEC.md`. Referências visuais em `referencias/`.

## Instalação nas máquinas

Imagem `ghcr.io/devmovebr/devmove-flow-ui`, publicada pelo workflow `.github/workflows/ui.yml` a cada tag `v*` (tags `<versão>` e `latest`, amd64 e arm64). A máquina só baixa a imagem.

Uma UI por máquina, na pasta `devmove-flow-ui/` ao lado dos projetos (ou outra, com `--ui`). Ela guarda só `projetos.txt` (caminhos absolutos) e o `docker-compose.yml` gerado. Cada projeto registrado é montado no mesmo caminho dentro do container.

| Situação | Comando |
|---|---|
| projeto novo ou existente | `setup/lib/instalar.sh <workspace> --valores ... [--ui <pasta>]` registra no fim |
| cópia já instalada | `tools/devmove-ui.sh registrar [--ui <pasta>]` |
| atualizar a imagem | automático no `/demanda` (`atualizar_framework.py`), ou `tools/devmove-ui.sh atualizar` |
| ver URL e projetos | `tools/devmove-ui.sh status` |

Primeiro acesso ao GHCR na máquina: `gh auth token | docker login ghcr.io -u <usuario-github> --password-stdin` (o token precisa de `read:packages`).

## Desenvolver

```bash
cd framework-ui/app
npm run dev        # API em 4800 e Vite em 5173, projetos = subpastas da raiz do repo
npm run dev:mock   # API simulada da Consultto em 4000, para o demo (POST /dev/reset volta a massa)
npm run build:cli  # regera tools/qa.mjs no framework e no demo
```

`docker compose up --build` nesta pasta builda a imagem local com os projetos da raiz do repo.

Mudou o runner: rode `build:cli` e versione o `framework/tools/qa.mjs`.
