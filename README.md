# CollabSphere

CollabSphere is an open-source workspace for teams to write documents, organize tasks, and collaborate in real time.

The repository contains a Vite + React web app, a NestJS API, a Hocuspocus collaboration service, a BullMQ worker, and shared PostgreSQL, Prisma, and Redis infrastructure. Core document collaboration and team workflows have been exercised locally by the maintainer. This README does not claim production readiness.

## Run locally

Requirements: Node.js 20+, pnpm 9, and Docker with Compose.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The development command starts the local infrastructure and application services. See [CONTRIBUTING.md](CONTRIBUTING.md) for configuration, troubleshooting, validation commands, and contribution workflow.

## Project documentation

- [Implementation status](IMPLEMENTATION_STATUS.md)
- [Architecture overview](docs/architecture/current-state.md)
- [Product and technical specifications](docs/spec/README.md)
