FROM node:24-slim AS build
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
ARG VERSAO=dev
LABEL org.opencontainers.image.source=https://github.com/devmovebr/devmove-flow \
      org.opencontainers.image.description="DevMove Flow UI" \
      org.opencontainers.image.version=$VERSAO

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash curl jq postgresql-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production PORT=4800 DEVMOVE_VERSAO=$VERSAO
EXPOSE 4800
CMD ["node", "--no-warnings=ExperimentalWarning", "dist/server.mjs"]
