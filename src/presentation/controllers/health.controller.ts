import { Controller, Get } from '@nestjs/common';

import {
  HealthResult,
  HealthStatusUseCase,
} from 'src/application/use-cases/health/health-status.use-case';

@Controller('health')
export class HealthController {
  constructor(private readonly healthStatus: HealthStatusUseCase) {}

  @Get()
  async check(): Promise<HealthResult> {
    return this.healthStatus.execute();
  }
}
