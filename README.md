# NestJS Auth API

REST API com autenticação JWT, CRUD de usuários, rate limiting e cache Redis em Clean Architecture.

## Stack

- **Framework:** NestJS 11
- **ORM:** TypeORM + PostgreSQL 16
- **Cache:** Redis 7 (cache-manager v7 + Keyv + KeyvRedis)
- **Auth:** JWT access + refresh tokens, Argon2 pra hash
- **Rate Limiting:** custom (fixed window atômico com MULTI + EXPIRE NX)
- **Errors:** RFC 7807 Problem Details (`application/problem+json`)
- **Docs:** Swagger (OpenAPI 3)
- **Tests:** Jest (unit com InMemory repository + e2e com DB real)
- **Deploy:** Docker multi-stage -> GHCR -> VPS + nginx + Cloudflare Flexible SSL
- **CI/CD:** GitHub Actions (lint + test + build + push)
- **Benchmark:** autocannon

## Architecture

Clean Architecture com 4 camadas. Decisões arquiteturais detalhadas (ADRs estilo Michael Nygard): veja [`ARCHITECTURE.md`](./ARCHITECTURE.md).

```
src/
├── domain/         Contratos puros (entities, interfaces, exceptions, consts)
├── application/    Use cases (1 classe = 1 operação = 1 execute())
├── presentation/   HTTP (controllers, guards, filters, decorators, DTOs)
└── infra/          Implementações técnicas (TypeORM, Redis, Argon2, JWT)
```

## Como rodar localmente

```bash
# 1. Copiar env
cp .env.example .env

# 2. Subir Postgres + Redis via Docker
docker compose -f infra/docker-compose.dev.yml up -d

# 3. Instalar dependências
npm install --legacy-peer-deps

# 4. Rodar migrations + seed
npm run migration:up
npm run seed:run

# 5. Iniciar dev server
npm run start:dev
```

- API: `http://localhost:5000`
- Swagger: `http://localhost:5000/api`

Credenciais de seed: `admin@nestapp.com` / `123456`.

## Testes

```bash
npm test              # unit (use-cases com InMemory repository + mocks)
npm run test:e2e      # integration (API + Postgres + Redis reais)
npm run test:cov      # coverage
```

## Benchmark

Medição do impacto do cache Redis em `GET /users/me`. Rode com `CACHE_ENABLED=true` e depois `false` (restart da API entre runs) pra comparar:

```bash
npm run bench
```

Resultados, análise e metodologia: [`scripts/benchmark-results.md`](./scripts/benchmark-results.md).

## Env vars

| Var | Descrição |
|---|---|
| `PORT` | Porta da API (dev: `5000`) |
| `P1_POSTGRES_HOST` / `PORT` / `USER` / `PASS` / `DB` | Conexão Postgres |
| `REDIS_HOST` / `REDIS_PORT` | Conexão Redis |
| `CACHE_ENABLED` | `true`/`false` -- bypassa cache (default `true`, usado pra benchmark) |
| `JWT_SECRET` | Secret do JWT (min 32 chars) |
| `ENV` | `dev` / `test` / `prod` |

Valores default em `.env.example`.

## Features

### Autenticação

- `POST /users` -- cadastro (rate limit 3/min)
- `POST /auth/login` -- retorna access (15min) + refresh (7d) tokens (rate limit 5/min)
- `POST /auth/refresh-token` -- renova access token (rate limit 10/min)
- `GET /users/me` -- perfil do usuário autenticado (JWT required)

### CRUD de usuários

- `GET /users?page=&limit=` -- listagem paginada (cache 1min)
- `GET /users/:id` -- detalhe (cache 5min)
- `PATCH /users/:id` -- atualização (write-through)
- `DELETE /users/:id` -- remoção

### Rate Limiting

Guard global lê metadata do decorator `@RateLimit(config)`. Chave: `ratelimit:Controller.handler:IP`. Resposta 429 RFC 7807 com headers `X-RateLimit-*` + `Retry-After`.

### Health Check

- `GET /health` -- status de Postgres + Redis em paralelo
