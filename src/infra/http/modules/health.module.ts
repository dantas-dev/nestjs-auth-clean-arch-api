import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisClientType } from 'redis';

import { HealthStatusUseCase } from 'src/application/use-cases/health/health-status.use-case';
import { HealthController } from 'src/presentation/controllers/health.controller';
import { TypeOrmConnection } from 'src/infra/database/connections/typeorm.connection';
import { RedisConnection } from 'src/infra/cache/connections/redis.connection';

@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: HealthStatusUseCase,
      useFactory: (dataSource: DataSource, redisClient: RedisClientType) => {
        const postgresConnection = new TypeOrmConnection(dataSource);
        const redisConnection = new RedisConnection(redisClient);
        return new HealthStatusUseCase(postgresConnection, redisConnection);
      },
      inject: [DataSource, 'REDIS_CLIENT'],
    },
  ],
})
export class HealthModule {}
