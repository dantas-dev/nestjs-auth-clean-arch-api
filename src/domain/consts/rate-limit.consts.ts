const oneMinute = 60;

export type RateLimitConfig = {
  limit: number;
  ttlSeconds: number;
};

/**
 * Login e a rota mais critica -- alvo primario de brute force.
 * Limite baixo (5/min) protege contra credential stuffing.
 */
export const AUTH_LOGIN_RATE_LIMIT: RateLimitConfig = {
  limit: 5,
  ttlSeconds: oneMinute,
};

/**
 * Refresh token e chamado em background (renovacao automatica).
 * Limite medio (10/min) permite uso normal sem bloquear client legitimo.
 */
export const AUTH_REFRESH_RATE_LIMIT: RateLimitConfig = {
  limit: 10,
  ttlSeconds: oneMinute,
};

/**
 * Registro e operacao rara por user real.
 * Limite agressivo (3/min) previne criacao em massa de contas.
 */
export const AUTH_REGISTER_RATE_LIMIT: RateLimitConfig = {
  limit: 3,
  ttlSeconds: oneMinute,
};
