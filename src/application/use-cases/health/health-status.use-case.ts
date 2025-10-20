import { IConnection } from 'src/domain/services';
import { ServiceUnavailableException } from 'src/domain/exceptions';

export interface HealthCheck {
  status: 'up' | 'down';
  responseTime: number;
  error?: string;
}

export interface HealthResult {
  status: 'ok' | 'degraded';
  uptime: number;
  checks: {
    postgres: HealthCheck;
    redis: HealthCheck;
  };
}

export class HealthStatusUseCase {
  constructor(
    private readonly postgresConnection: IConnection,
    private readonly redisConnection: IConnection,
  ) {}

  async execute(): Promise<HealthResult> {
    const [postgres, redis] = await Promise.all([
      this.checkConnection(this.postgresConnection),
      this.checkConnection(this.redisConnection),
    ]);

    const healthy = postgres.status === 'up' && redis.status === 'up';

    const result: HealthResult = {
      status: healthy ? ('ok' as const) : ('degraded' as const),
      uptime: process.uptime(),
      checks: { postgres, redis },
    };

    if (!healthy) {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }

  private async checkConnection(connection: IConnection): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await connection.isHealthy();
      return { status: 'up', responseTime: Date.now() - start };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 'down',
        responseTime: Date.now() - start,
        error: message,
      };
    }
  }
}
