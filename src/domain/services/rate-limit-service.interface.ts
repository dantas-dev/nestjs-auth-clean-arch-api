export interface IRateLimitService {
  consume(
    key: string,
    limit: number,
    ttlSeconds: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }>;
}
