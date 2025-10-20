import KeyvRedis, { Keyv } from '@keyv/redis';
import { Cache } from 'cache-manager';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';

import { RedisCacheService } from 'src/infra/cache/redis-cache.service';
import { RedisRateLimitService } from 'src/infra/services/redis-rate-limit.service';

@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        stores: [
          new Keyv({
            store: new KeyvRedis(
              `redis://${config.get<string>('REDIS_HOST')}:${config.get<number>('REDIS_PORT')}`,
            ),
            namespace: 'cache',
          }),
        ],
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (config: ConfigService) => {
        const client = createClient({
          socket: {
            host: config.get<string>('REDIS_HOST'),
            port: config.get<number>('REDIS_PORT'),
            connectTimeout: 5000,
            reconnectStrategy: (retries) => {
              if (retries > 3) return new Error('Redis connection failed');
              return Math.min(retries * 100, 3000);
            },
          },
        });
        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
    {
      provide: 'ICacheService',
      useFactory: (
        cache: Cache,
        redisClient: RedisClientType,
        configService: ConfigService,
      ) => new RedisCacheService(cache, redisClient, configService),
      inject: [CACHE_MANAGER, 'REDIS_CLIENT', ConfigService],
    },
    {
      provide: 'IRateLimitService',
      useFactory: (redisClient: RedisClientType) =>
        new RedisRateLimitService(redisClient),
      inject: ['REDIS_CLIENT'],
    },
  ],
  exports: ['ICacheService', 'REDIS_CLIENT', 'IRateLimitService'],
})
@Global()
export class RedisModule implements OnApplicationShutdown {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  async onApplicationShutdown() {
    await this.redisClient.quit();
  }
}
