import type { RedisClientType } from 'redis';

import { IRateLimitService } from 'src/domain/services';

export class RedisRateLimitService implements IRateLimitService {
  constructor(private readonly redisClient: RedisClientType) {}

  async consume(
    key: string,
    limit: number,
    ttlSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const results = await this.redisClient
      .multi()
      .incr(key)
      .expire(key, ttlSeconds, 'NX')
      .pTTL(key)
      .exec();

    const count = Number(results[0]);
    const pttl = Number(results[2]);

    const resetAt = Math.floor((Date.now() + pttl) / 1000);
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    return { allowed, remaining, resetAt };
  }
}
