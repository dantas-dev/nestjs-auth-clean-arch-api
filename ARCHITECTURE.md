# Architecture

Este documento descreve a arquitetura do sistema e as decisões arquiteturais (ADRs -- Architecture Decision Records) no formato [Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

Cada ADR captura: **o problema** (Context), **o que decidimos** (Decision) e **os trade-offs** (Consequences). Não é documentação de código -- é o "por que" por trás das escolhas.

## Overview

REST API em NestJS implementando Clean Architecture com 4 camadas, autenticação JWT (access + refresh), cache Redis (cache-aside + write-through), rate limiting custom (fixed window com MULTI + EXPIRE NX) e respostas de erro em RFC 7807. Deploy via Docker multi-stage em VPS atrás de nginx + Cloudflare.

## Layer Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                       Dependency Rule                          │
│           (imports sempre apontam pra DENTRO)                  │
│                                                                │
│   ┌──────────────────┐      ┌──────────────────┐               │
│   │   presentation   │      │       infra      │               │
│   │                  │      │                  │               │
│   │  - Controllers   │      │  - TypeORM       │               │
│   │  - Guards        │      │    (repos)       │               │
│   │  - Filters       │      │  - Redis         │               │
│   │    (RFC 7807)    │      │    (cache +      │               │
│   │  - Decorators    │      │     rate-limit)  │               │
│   │  - DTOs          │      │  - Argon2 / JWT  │               │
│   │  - Presenters    │      │  - Modules (DI)  │               │
│   └────────┬─────────┘      └────────┬─────────┘               │
│            │                         │                         │
│            └────────────┬────────────┘                         │
│                         │                                      │
│                         ▼                                      │
│                 ┌───────────────┐                              │
│                 │  application  │                              │
│                 │               │                              │
│                 │  - Use Cases  │                              │
│                 │   (pure TS,   │                              │
│                 │    no Nest)   │                              │
│                 └───────┬───────┘                              │
│                         │                                      │
│                         ▼                                      │
│                 ┌───────────────┐                              │
│                 │    domain     │                              │
│                 │               │                              │
│                 │  - Entities   │  (puras, sem decorators)     │
│                 │  - Interfaces │  (IHashService, ICache...)   │
│                 │  - Exceptions │  (NotFound, Unauthorized...) │
│                 │  - Consts     │  (TTL, RateLimit configs)    │
│                 └───────────────┘                              │
│                                                                │
│   domain NUNCA importa de nada.                                │
│   application importa só do domain.                            │
│   presentation/infra podem importar de qualquer lugar.         │
└────────────────────────────────────────────────────────────────┘
```

## ADR Index

| # | Título | Status |
|---|---|---|
| [0001](#adr-0001-clean-architecture-com-4-camadas--usefactory-pra-di) | Clean Architecture com 4 camadas + useFactory pra DI | Accepted |
| [0002](#adr-0002-entity-domain-vs-model-infra) | Entity (Domain) vs Model (Infra) | Accepted |
| [0003](#adr-0003-jwt-com-access--refresh-tokens) | JWT com access + refresh tokens | Accepted |
| [0004](#adr-0004-rfc-7807-pra-respostas-de-erro) | RFC 7807 pra respostas de erro | Accepted |
| [0005](#adr-0005-redis-cache-aside--write-through-invalidation) | Redis cache-aside + write-through invalidation | Accepted |
| [0006](#adr-0006-presenter-pattern-em-vez-de-exclude) | Presenter pattern em vez de @Exclude | Accepted |
| [0007](#adr-0007-rate-limiting-custom-sem-nestjsthrottler) | Rate limiting custom (sem @nestjs/throttler) | Accepted |
| [0008](#adr-0008-multi-stage-dockerfile--ghcr-deploy) | Multi-stage Dockerfile + GHCR deploy | Accepted |

---

## ADR 0001: Clean Architecture com 4 camadas + useFactory pra DI

### Status
Accepted

### Context

Arquitetura simples (tudo em `modules/` com `@Injectable()` em toda classe) é rápida de escrever mas:

- Acopla use-cases ao NestJS (impossível testar sem `@nestjs/testing`)
- Mistura regra de negócio com detalhes de framework
- Dificulta trocar ORM/cache/hash sem reescrever tudo

Aplicar dependency inversion, SOLID e separação de responsabilidades resolve esses pontos.

### Decision

Adotar Clean Architecture com 4 camadas e **dependency rule**: imports sempre apontam pra dentro.

- **`domain/`** -- classes puras. Entities, interfaces (`IHashService`, `ICacheService`, `IRateLimitService`, `IUserRepository`), exceptions, consts. Zero imports de framework.
- **`application/`** -- use cases. Classes TypeScript puras, sem `@Injectable()`, com método `execute()`. Importam só do domain.
- **`presentation/`** -- HTTP. Controllers, guards, filters, decorators, DTOs. Delegam pros use cases.
- **`infra/`** -- implementações concretas. `TypeOrmUserRepository`, `RedisCacheService`, `Argon2HashService`, `JwtTokenService`.

DI dos use cases via **`useFactory`** nos modules (não `useClass`), pra evitar `@Injectable()` nas classes puras:

```typescript
{
  provide: CreateUserUseCase,
  useFactory: (repo: IUserRepository, hash: IHashService) =>
    new CreateUserUseCase(repo, hash),
  inject: ['IUserRepository', 'IHashService'],
}
```

### Consequences

**+** Use cases testáveis com `new UseCase(mockRepo, mockHash)` -- zero dependência do `@nestjs/testing`.
**+** Trocar TypeORM por Prisma, Argon2 por Bcrypt, JWT por Paseto -- muda 1 binding no module. Zero mudança em use cases.
**+** Domínio expressa regra de negócio, não detalhe técnico.
**+** Violações de arquitetura aparecem no import (um `application/` importando de `infra/` é óbvio).

**-** Mais boilerplate de início (interfaces, factories) que uma abordagem "tudo em controllers + services".
**-** Curva de aprendizado pra quem vem de NestJS tutorial-driven.
**-** Factories verbosas quando use case tem 6+ deps. Aceitável.

---

## ADR 0002: Entity (Domain) vs Model (Infra)

### Status
Accepted

### Context

TypeORM exige decorators (`@Entity`, `@Column`, `@PrimaryColumn`) na classe que representa a tabela. Se a entity tiver esses decorators, ela vira dependente do TypeORM -- viola Clean Arch (`domain/` não pode depender de framework).

### Decision

Manter duas representações separadas:

- **`domain/entities/user.entity.ts`** -- classe TypeScript pura. Sem decorators. Expressa o conceito de negócio.
- **`infra/database/models/user.model.ts`** -- classe com decorators TypeORM. Representa a tabela no banco.

Repositórios (`TypeOrmUserRepository`) traduzem entre os dois: `toDomain(model)` / `toPersistence(entity)`. Use cases só conhecem `UserEntity`.

### Consequences

**+** Domain independente de ORM. Trocar TypeORM por Prisma = mudar Model e o mapeador. Entity + use cases intactos.
**+** Entity livre pra ter métodos de negócio (validações, state transitions) sem atrapalhar serialização.
**+** Testes de use case não precisam mockar TypeORM.

**-** Duplicação de campos (entity e model têm os mesmos atributos, por ora).
**-** Mapeamento boilerplate nos repositories.
**-** Mais 1 arquivo por entidade.

Trade-off aceitável pro benefício arquitetural.

---

## ADR 0003: JWT com access + refresh tokens

### Status
Accepted

### Context

Autenticação stateless em API REST. Sessions em DB/Redis adicionariam round-trip por request. Single-token JWT de longa duração tem segurança fraca (se vazou, atacante usa por horas).

### Decision

Dois tokens:

- **Access token** (15 min) -- JWT curto, mandado em `Authorization: Bearer`. Usado em toda request autenticada.
- **Refresh token** (7 dias) -- JWT longo, trocado por novo access em `POST /auth/refresh-token`.

Payload inclui `type: 'access' | 'refresh'`. `JWTAuthGuard` recusa tokens com `type !== 'access'`. Impede usar refresh pra acessar rotas protegidas.

Ambos assinados com o mesmo `JWT_SECRET`. Rotação de secret invalida tudo (aceitável -- em prod, emissão de novos tokens cobriria).

### Consequences

**+** Janela de ataque pequena (15min). Vazamento de access tem impacto limitado.
**+** Refresh permite renovação sem pedir senha.
**+** Zero estado no servidor -- escala horizontalmente sem sticky sessions.
**+** Campo `type` previne abuso cruzado de tokens.

**-** Refresh revogation exige blocklist (Redis ou DB). Não implementado -- refresh continua válido até expirar mesmo após logout.
**-** Mais 1 endpoint pra manter.
**-** Client precisa saber renovar proativamente (interceptor no frontend).

---

## ADR 0004: RFC 7807 pra respostas de erro

### Status
Accepted

### Context

Respostas de erro heterogêneas entre endpoints dificultam consumo pelo client. Formatos comuns:

- `{ message: string }` -- NestJS default. Pouco informativo.
- `{ error, statusCode, message }` -- comum. Não padronizado.

Padrão oficial, bem documentado e máquina-legível é o ideal.

### Decision

Adotar **RFC 7807 / 9457 (Problem Details for HTTP APIs)**. Todo erro serializado via `AllExceptionsFilter` em `application/problem+json`:

```json
{
  "type": "https://httpstatuses.com/404",
  "title": "NOT_FOUND",
  "status": 404,
  "detail": "User with id 123 not found.",
  "instance": "/users/123"
}
```

Mapeamento de exceptions do domínio (sem HTTP) pra status HTTP via `STATUS_MAP`:

```typescript
NotFoundException      -> 404
AlreadyExistsException -> 409
UnauthorizedException  -> 401
ServiceUnavailableEx.  -> 503
```

Exceptions de negócio ficam em `domain/exceptions/` -- puras, sem `@nestjs/common`.

### Consequences

**+** Padrão IETF amplamente suportado (Problem Details em Spring, ASP.NET, Elixir, etc).
**+** Content-Type específico (`application/problem+json`) -- client filtra fácil.
**+** Exceptions de domínio não conhecem HTTP -- Clean Arch preservado.
**+** Adicionar campo customizado (ex: `errors: [{...}]` pra validation) é trivial.

**-** Libs como `class-validator` retornam em formato NestJS (não RFC 7807). Precisa adaptar no filter.
**-** Alguns clients esperam `{ error: '...' }` tradicional. Doc do Swagger deixa claro.

---

## ADR 0005: Redis cache-aside + write-through invalidation

### Status
Accepted

### Context

Sem cache, toda `GET /users/:id` hita o Postgres. Benchmark local (veja [`scripts/benchmark-results.md`](./scripts/benchmark-results.md)) mostra -30% latência avg com cache em endpoint trivial. Projeção pra produção (Postgres remoto): 3x-5x.

Opções de estratégia:

- **Read-through**: cache chama DB no miss. Exige proxy; menos controle.
- **Cache-aside**: use case verifica cache, no miss busca DB e popula cache. Controle total.
- **Write-through**: escrita atualiza DB e cache. Invalidação explícita.
- **Write-behind**: escrita só no cache, DB async. Complexo, perigoso.

### Decision

**Cache-aside** nos reads, **write-through** nas escritas.

Reads (`FindUserUseCase`):
1. `cache.get(key)` -- hit: retorna.
2. Miss: `repository.find()` + `cache.set(key, result, ttl)` + retorna.

Writes (`UpdateUserUseCase`, `DeleteUserUseCase`):
1. `repository.update/delete(id)`.
2. `cache.set(user:${id}, updated, ttl)` -- atualiza detail.
3. `cache.deleteByPrefix('users:page:')` -- invalida listagens paginadas (`SCAN` + `DEL`).

TTLs: `USER_LIST_CACHE_TTL = 1min`, `USER_DETAILS_CACHE_TTL = 5min`. Constantes em `domain/consts/`. Safety net contra bugs de invalidação -- mesmo que `deleteByPrefix` falhe, stale dura no máximo 1-5 min.

Abstração via `ICacheService` (domain) com impl `RedisCacheService` (infra). Use cases não sabem que é Redis.

### Consequences

**+** Use cases em controle de quando cachear -- explícito > mágico.
**+** Writes propagam pra cache imediatamente (no stale após update).
**+** TTL garante eventual consistency mesmo se invalidação falhar.
**+** Trocar Redis por Memcached = mudar impl do `ICacheService`. Zero mudança em use cases.

**-** `deleteByPrefix` com `SCAN` é O(N) no número de keys. Pra tabelas gigantes pode ficar caro.
**-** Stale entre write e deleteByPrefix (microssegundos, mas existe).
**-** Mais 1 dependência (Redis) em dev e prod.

---

## ADR 0006: Presenter pattern em vez de @Exclude

### Status
Accepted

### Context

`User.password` (hash Argon2) não pode vazar em responses HTTP. Abordagens:

- **`@Exclude` do class-transformer**: decorator na entity. Funciona com `ClassSerializerInterceptor`.
- **Presenter pattern**: classe separada `UserPresenter.toHTTP(user)` filtra campos.

Após adotar cache Redis, descobri que `@Exclude` **quebra** quando objeto vem do cache. Motivo: `JSON.parse` cria plain object sem prototype -- decorators não têm efeito. Hash voltava a vazar.

### Decision

Abandonar `@Exclude`. Usar **Presenter pattern**:

```typescript
class UserPresenter {
  static toHTTP(user: UserEntity): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      // password OMITIDO explicitamente
    };
  }

  static toHTTPMany(users: UserEntity[]): UserResponse[] {
    return users.map(UserPresenter.toHTTP);
  }
}
```

Controllers chamam `UserPresenter.toHTTP(user)` antes de retornar.

### Consequences

**+** Funciona com plain objects (cache) e instâncias de classe identicamente.
**+** Explícito -- leitor do código vê exatamente o que vai pro response. `@Exclude` é fácil de esquecer.
**+** Separação clara entre modelo interno e shape HTTP. Resposta pode ter campos derivados (ex: `fullName = firstName + lastName`) sem poluir entity.
**+** Type-safe via `UserResponse` interface.

**-** Mais boilerplate -- 1 método por tipo de response.
**-** Se esquecer de chamar `.toHTTP`, password vaza. Mitigado com `UserResponse` em `@ApiResponse({ type: UserResponse })` + lint.

---

## ADR 0007: Rate limiting custom (sem @nestjs/throttler)

### Status
Accepted

### Context

Proteção contra brute force no login, credential stuffing, bot signup. Opções:

- **`@nestjs/throttler` + `@nest-lab/throttler-storage-redis`**: lib oficial. Decorator `@Throttle`, guard built-in.
- **Custom**: implementar guard, decorator e service do zero usando `REDIS_CLIENT`.

Lib é pragmática em produção, mas custom dá controle total sobre atomicidade, race conditions e semântica de TTL.

### Decision

Implementar do zero:

- **`IRateLimitService`** (domain) -- contrato `consume(key, limit, ttlSeconds)`.
- **`RedisRateLimitService`** (infra) -- usa `MULTI` + `INCR` + `EXPIRE NX` + `PTTL` atômico.
- **`@RateLimit(config)`** (presentation) -- decorator via `SetMetadata`.
- **`RateLimitGuard`** global via `APP_GUARD` -- lê metadata via `Reflector`, gera key `ratelimit:Controller.handler:IP`, chama service, seta headers, joga 429 se bloqueado.

Algoritmo: **fixed window counter**. Simples e se encaixa com `INCR`+`EXPIRE`. Trade-off conhecido: pico efetivo pode dobrar na virada da janela. Aceitável pra MVP.

Chave da atomicidade: `EXPIRE key ttl NX`. NX = "só seta TTL se ainda não tem". Sem isso, toda req resetaria o TTL e cliente nunca seria bloqueado.

Erro 429 segue RFC 7807 (mesmo filter). Headers `X-RateLimit-Limit/Remaining/Reset` + `Retry-After`.

### Consequences

**+** Controle fino sobre Redis atomicity, TTL semantics e guards/metadata do NestJS.
**+** Zero dependência externa. Código legível em ~100 linhas total.
**+** Integração nativa com `AllExceptionsFilter` existente (RFC 7807 sem setup extra).
**+** Capacidade de evoluir pra sliding window ou token bucket sem mudar API.

**-** Mais código pra manter. Bug de concorrência seria catastrófico.
**-** Lua script seria ainda mais atômico (1 round-trip vs MULTI). Não implementado -- aceitável pra escala atual.
**-** `X-Forwarded-For` spoofing possível se nginx não limpar. Aceitável (atacante só afeta o IP dele).

---

## ADR 0008: Multi-stage Dockerfile + GHCR deploy

### Status
Accepted

### Context

Deploy inicial em VPS. Requisitos:
- Build reprodutível
- Imagem pequena em produção
- Pipeline automatizada (push -> deploy)
- Secrets não vazam

Opções de registry: Docker Hub (público ou pago privado), GHCR (privado gratuito com GitHub), AWS ECR (pago, overkill).

### Decision

**Dockerfile multi-stage:**

```dockerfile
FROM node:24.13.0-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS prod
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY --from=build /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/src/main"]
```

3 stages efetivos (base é alias): **deps** (instala tudo, pra build), **build** (compila TS -> JS), **prod** (imagem final). Prod reinstala só dependências de runtime (`--omit=dev`) em vez de copiar `node_modules` do deps -- menor, limpa. `--legacy-peer-deps` contorna conflito `ts-jest@29` vs `jest@30`. Node alpine = base mínima (~40MB).

**Registry: GHCR** (ghcr.io). Gratuito pra repos GitHub. Token `GITHUB_TOKEN` já injetado no Actions -- zero setup de secrets.

**CI/CD (GitHub Actions):**

1. `lint + test + build` em PR e merge.
2. No merge pra main: build da imagem + push pro GHCR com tag `latest` + tag commit SHA.
3. Webhook/SSH no VPS (manual por ora) pra `docker compose pull && docker compose up -d`.

VPS tem `docker-compose.prod.yml` com `image: ghcr.io/...:latest` e `build: .` coexistindo -- dev local roda `--build`, prod puxa imagem do registry.

### Consequences

**+** Imagem final muito menor que single-stage (node alpine + dist + prod deps apenas). Pull mais rápido no deploy.
**+** Zero código fonte (TS), zero devDeps, zero cache de npm no container final.
**+** GHCR gratuito + auth automática via `GITHUB_TOKEN`.
**+** Separação de preocupações: CI builda, deploy só puxa.
**+** Tag por SHA permite rollback trivial (`docker pull ghcr.io/...:abc123`).

**-** Deploy ainda manual (SSH no VPS). Automatizar com webhook ou GitOps (ArgoCD/Flux) seria próximo passo.
**-** Secrets de runtime (`.env`) gerenciados manualmente no VPS. Vault/SOPS seria melhor.
**-** Sem blue-green ou canary -- downtime de ~1s no `docker compose up -d`.

---

## Próximos passos

- Observability: structured logs + metrics Prometheus + tracing OpenTelemetry
- Distributed rate limit -- Lua script pra atomicidade máxima
- Blocklist de refresh tokens (logout real)
- Blue-green deploy via Traefik
- Automated VPS deploy via webhook
- Migrations no CI

## Referências

- [Michael Nygard -- Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [Clean Architecture -- Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [RFC 9457 -- Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [Redis EXPIRE -- NX / XX / GT / LT options](https://redis.io/docs/latest/commands/expire/)
