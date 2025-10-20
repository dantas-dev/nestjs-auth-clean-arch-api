# Benchmark: Cached vs Uncached

Medicao do impacto do cache Redis (cache-aside, TTL 5min) em `GET /users/me`. Mesma query, mesmo endpoint, flag `CACHE_ENABLED` controla se o `RedisCacheService` bypassa o cache. Rodado com `autocannon` -- 10 conexoes, 15 segundos, ambiente dev local.

## Setup

- API em `localhost:5000` (NestJS + TypeORM + Postgres 16 + Redis 7-alpine, tudo em Docker)
- Endpoint: `GET /users/me` (JWTAuthGuard + `FindUserUseCase` com cache-aside)
- Autocannon: `-c 10 -d 15`
- Pre-run: `FLUSHDB` + 1 req de warm-up

## Resultados

### Latencia (ms)

| Stat   | Cached (enabled) | Uncached (disabled) | Delta     |
|--------|------------------|---------------------|-----------|
| p50    | 8                | 11                  | **-27%**  |
| p97.5  | 14               | 24                  | **-42%**  |
| p99    | 17               | 27                  | **-37%**  |
| Avg    | 9.03             | 12.85               | **-30%**  |
| Max    | 34               | 77                  | **-56%**  |
| Stdev  | 2.01             | 4.19                | **-52%**  |

### Throughput

| Stat          | Cached   | Uncached | Delta     |
|---------------|----------|----------|-----------|
| Req/sec (avg) | 1,039.34 | 748.67   | **+39%**  |
| Req/sec (min) | 850      | 576      | +48%      |
| Req/sec (p50) | 1,060    | 787      | +35%      |
| Total reqs    | 16k      | 11k      | +45%      |
| Bytes/sec     | 380 kB   | 274 kB   | +39%      |

## Analise

### O que o cache entregou

**+39% throughput, -30% latencia media.** Com cache, a API processa 1 req a cada ~0.96ms (mediana). Sem cache, ~1.27ms. Em 15s, a diferenca sao ~5 mil requisicoes a mais servidas.

O ganho maior aparece na **tail latency**:
- p99: -37% (17ms -> 27ms)
- max: -56% (34ms -> 77ms)
- stdev: -52% (2ms -> 4.2ms)

Stdev metade significa latencias mais previsiveis -- melhor pra SLA (p99/p999 matter mais que avg em sistemas serios).

### Por que a diferenca nao e mais gritante

Tres fatores atenuam o delta em ambiente local:

1. **Postgres local (unix socket/rede interna Docker)**: zero latencia de rede. Em produo com RDS/Cloud SQL, cada query gasta 1-3ms de RTT. Cache pularia isso.
2. **Query simples**: `SELECT * FROM users WHERE id = ?` em tabela com poucos registros, index na PK. Complexidade O(log n) quase instantanea. Cache brilha mais em queries agregadas/joins pesados.
3. **Pool de conexoes TypeORM ja aquecido**: primeira conexao custa ~10ms; subsequentes sao reusadas. Benchmark longo esconde esse custo.

### Projecao pra producao

Em ambiente real (VPS + DNS Cloudflare + Postgres em outra region), esperariamos:

- **Sem cache**: latencia adicional de rede pro DB (~5-20ms). p99 facilmente 50-100ms em picos.
- **Com cache**: Redis na mesma VPS = ~1-2ms. Cache hits ficam sub-10ms consistentemente.

Delta real em prod deve ser 3x-5x maior que o medido localmente.

### Trade-off do cache

Ganho de performance tem custos:

- **Complexidade**: cache-aside + write-through + invalidacao por prefixo (deleteByPrefix com SCAN). Mais codigo, mais bugs potenciais.
- **Consistencia**: dados podem ficar stale ate o TTL expirar (5min pra detalhe, 1min pra lista). Aceitavel pra /users/me, nao aceitavel pra /payments/:id.
- **Memoria**: Redis guarda copia dos dados. Em tabela grande com cache amplo, custo sobe.

Pra este endpoint (read-heavy, dados de usuario pouco mudam), o trade-off compensa claramente.

## Metodologia

### Por que `/users/me`

- Hits o mesmo `FindUserUseCase` que `/users/:id`
- Nao precisa hardcodar ID (usa `sub` do JWT)
- Sem `@RateLimit` aplicado -- nao atrapalha o throughput

### Por que `CACHE_ENABLED` em vez de dois endpoints

Alternativas descartadas:

- **Comentar cache no use-case**: muda codigo versionado, risco de commitar por acidente.
- **Endpoint separado `/users/:id/nocache`**: duplica rota, sujeira no OpenAPI.
- **Variar IDs pra forcar miss**: precisa seed de 1000+ users, autocannon nao tem modo dinamico nativo.

Flag em env foi mais cirurgico -- `RedisCacheService.get` retorna null quando `CACHE_ENABLED=false`, use-cases continuam chamando `cache.get/set` ignorantemente.

### Limitacoes do teste

- **Single machine**: API + DB + Redis na mesma maquina. Rede zero. Producao tera latencias diferentes.
- **15s e pouco**: statisticamente apertado. Runs longos (60s+) dariam p99 mais confiaveis.
- **Sem burst**: autocannon mantem 10 conexoes constantes. Nao simula trafego real (picos + idle).
- **Warm-up com 1 req so**: primeira req do benchmark pode ainda estar compilando queries internas do TypeORM. Idealmente 100 reqs de warm-up.

## Reproduzir

```bash
# 1. Confirmar .env
grep CACHE_ENABLED .env   # true ou false

# 2. Restart API (ConfigService le .env no boot)
# Ctrl+C + npm run start:dev

# 3. Rodar bench
npm run bench

# 4. Output em scripts/results/bench-<state>-<timestamp>.txt
```

Arquivos raw: [`scripts/results/`](./results/)
