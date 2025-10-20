import type { Request, Response } from 'express';

import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { IRateLimitService } from 'src/domain/services';
import { RateLimitConfig } from 'src/domain/consts/rate-limit.consts';

import { RATE_LIMIT_KEY } from 'src/presentation/decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('IRateLimitService')
    private readonly rateLimitService: IRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!config) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const ip = this.extractIp(request);
    const handler = `${context.getClass().name}.${context.getHandler().name}`;
    const key = `ratelimit:${handler}:${ip}`;

    const { allowed, remaining, resetAt } = await this.rateLimitService.consume(
      key,
      config.limit,
      config.ttlSeconds,
    );

    response.setHeader('X-RateLimit-Limit', config.limit);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', resetAt);

    if (!allowed) {
      const retryAfter = Math.max(0, resetAt - Math.floor(Date.now() / 1000));
      response.setHeader('Retry-After', retryAfter);
      throw new HttpException(
        'Too many requests, please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private extractIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? 'unknown';
  }
}
