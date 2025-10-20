import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const startTime = Date.now();

    response.on('finish', () => {
      const elapsedTime = Date.now() - startTime;
      console.log(
        `[${request.method}] ${request.originalUrl} - ${response.statusCode} - ${elapsedTime}ms`,
      );
    });

    next();
  }
}
