# Repo Guide

## Role

`auth.myglobal.site` is the Liquid Auth service used for authentication and credential-related flows across the platform.

## Hostname

- `auth.myglobal.site`

## Stack

- NestJS service
- session-based auth and credential flows
- Docker-based local environment

## Start Here For

- sign-in and auth-domain behavior
- credential verification and proof flows
- session/auth service integration

## Common Commands

```bash
npm run dev
npm run build
npm run test
docker-compose up -d
```

## Boundaries

- Changes here often require coordinated updates in consuming applications.
- If a task affects user-facing auth flows, inspect the relevant application repo as well.
- For wallet-linked or on-chain auth primitives (signing challenges, contract-gated access, etc.), coordinate with `../app.myglobal.site` and follow `../TokenizeRWATemplate/AGENTS.md` for any contract or app spec work.
- Record shared auth assumptions in `../docs/integration.md`.
