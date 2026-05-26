FROM node:20-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice-writer \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY scripts ./scripts
COPY packages ./packages
COPY apps/worker ./apps/worker

RUN corepack enable \
  && corepack prepare pnpm@9.15.9 --activate \
  && pnpm install --frozen-lockfile \
  && pnpm --filter @collabsphere/database run generate \
  && pnpm --filter @collabsphere/worker run build

ENV NODE_ENV=production
ENV STORAGE_LOCAL_PATH=/tmp/collabsphere-uploads
ENV PATH="/app/node_modules/.bin:${PATH}"

VOLUME ["/tmp/collabsphere-docx-imports", "/tmp/collabsphere-uploads"]

WORKDIR /app/apps/worker
# tsx resolves workspace package exports (.ts) like local `pnpm dev`.
CMD ["tsx", "src/main.ts"]
