import { Cache } from 'cache-manager';
import { RedisArgument, RedisClientType } from 'redis';

import { ConfigService } from '@nestjs/config';

import { ICacheService } from 'src/domain/services';

export class RedisCacheService implements ICacheService {
  private readonly enabled: boolean;

  constructor(
    private readonly cache: Cache,
    private readonly redisClient: RedisClientType,
    configService: ConfigService,
  ) {
    this.enabled = configService.get<string>('CACHE_ENABLED') !== 'false';
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;
    const value = await this.cache.get<T>(key);
    return value ?? null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.enabled) return;
    await this.cache.set(key, value, ttl);
  }

  async delete(key: string): Promise<void> {
    if (!this.enabled) return;
    await this.cache.del(key);
  }

  async deleteByPrefix(prefix: string, limit: number = 1000): Promise<void> {
    if (!this.enabled) return;

    let cursor: RedisArgument = '0';
    let deleted = 0;

    do {
      const result = await this.redisClient.scan(cursor, {
        MATCH: `cache::cache:${prefix}*`,
        COUNT: 100,
      });
      cursor = result.cursor;

      if (result.keys.length > 0) {
        await this.redisClient.del(result.keys);
        deleted += result.keys.length;
      }

      if (deleted >= limit) break;
    } while (Number(cursor) !== 0);
  }
}
