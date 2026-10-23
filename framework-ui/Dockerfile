FROM node:24-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash curl jq postgresql-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production PORT=4800 DEVMOVE_WORKSPACES=/workspaces
EXPOSE 4800
CMD ["npm", "start"]
