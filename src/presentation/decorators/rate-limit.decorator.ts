import { SetMetadata } from '@nestjs/common';

import { RateLimitConfig } from 'src/domain/consts/rate-limit.consts';

export const RATE_LIMIT_KEY = 'rate-limit';

export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);
