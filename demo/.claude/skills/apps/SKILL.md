---
name: apps
description: Descobre como subir cada repositório de code/ nesta máquina e grava o roteiro em tools/.local/apps.json, para o play da DevMove Flow UI e o tools/apps.sh. Uso: /apps [repo]
disable-model-invocation: true
---
`$ARGUMENTS` = repositório de `tools/repos.txt` (vazio: todos sem app em `tools/.local/apps.json`).

`tools/.local/apps.json` fica fora do git: JDK, Node e CLIs mudam de máquina para máquina. Formato:

```json
{
  "<app>": {
    "repo": "<pasta em code/>",
    "pasta": "code/<repo>",
    "comando": "<comando de subida, roda com bash -c na pasta>",
    "env": { "JAVA_HOME": "<caminho nesta máquina>" },
    "antes": ["tools/db-local.sh up"],
    "porta": 8080,
    "health": "http://localhost:8080/actuator/health"
  }
}
```

`repo` e `pasta` têm padrão (nome da app e `code/<repo>`); `env`, `antes`, `porta` e `health` são opcionais. Um repositório pode ter mais de uma app (API e worker, monorepo de functions): uma chave por processo.

1. Liste o que falta: `tools/apps.sh repo listar`. Repositório não clonado: `tools/clonar-repos.sh` antes.
2. Para cada repositório, levante a subida local nesta ordem, parando no primeiro que responde:
   - a linha "Subir local" de `.claude/rules/code/servicos/<serviço>.md` e script que a cópia já tenha em `tools/`;
   - Java: `mvnw`/`gradlew` (sem wrapper, `mvn`/`gradle` do PATH), profile local em `application-*.yml`; versão em `pom.xml` (`java.version`, `maven.compiler.release`), `build.gradle` (`toolchain`, `sourceCompatibility`), `.java-version`, `.sdkmanrc`. Procure o JDK dessa versão na máquina (`JAVA_HOME` atual, `~/.sdkman/candidates/java`, `~/.jdks`, `/usr/lib/jvm`, `C:/Program Files/Java`, `C:/Program Files/Eclipse Adoptium`) e ponha em `env.JAVA_HOME`;
   - Node: script `start:dev`, `dev` ou `start` do `package.json`, gerenciador pelo lockfile (`pnpm`, `yarn`, `npm`); versão em `.nvmrc` ou `engines` diferente da do PATH vira `comando` com o node certo;
   - Azure Functions: `host.json` → `func start --port <porta>`, com `local.settings.json` presente (sem ele, pergunte de onde vem; nunca invente segredo);
   - porta e health: `server.port`, `PORT` do `.env.example`, `launchSettings`, `/actuator/health`, `/health`.
   Comando que não cabe numa linha (sdkman, `nvm use`, variáveis encadeadas) vira script em `tools/.local/apps/<app>.sh` e `comando: "bash ../../tools/.local/apps/<app>.sh"`.
3. Grave a entrada no `tools/.local/apps.json` sem apagar as que já existem.
4. Prove cada app: `tools/apps.sh up <app> --esperar 300`. Falhou: leia o primeiro erro real em `tools/apps.sh logs <app> -n 80`, ajuste a entrada e repita até 3 vezes; persistindo, spawn do `igor-infra-local` com o erro (orçamento 60 chamadas). No ar: `tools/apps.sh down <app>`.
5. `tools/apps.sh ligar` para o play da UI funcionar.
6. Relate uma linha por app: `<app> · <comando> · <porta> · no ar em <s>` ou o bloqueio. Subida que diverge da linha "Subir local" da rule do serviço: proponha a troca num gate.

Repositório novo no projeto: `tools/apps.sh repo adicionar <pasta> <url>` (clona e registra no `tools/repos.txt` com commit; a UI espelha no banco) e depois `/apps <pasta>`.
