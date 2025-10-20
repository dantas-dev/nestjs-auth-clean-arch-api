import { RedisClientType } from 'redis';

import { IConnection } from 'src/domain/services';

export class RedisConnection implements IConnection {
  constructor(private readonly redisClient: RedisClientType) {}

  async isHealthy(): Promise<boolean> {
    const pong = await this.redisClient.ping();
    return pong === 'PONG';
  }
}
