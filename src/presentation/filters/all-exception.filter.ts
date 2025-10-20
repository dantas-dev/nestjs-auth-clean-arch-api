import {
  Catch,
  HttpStatus,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const STATUS_MAP: Record<string, number> = {
      NotFoundException: HttpStatus.NOT_FOUND,
      AlreadyExistsException: HttpStatus.CONFLICT,
      UnauthorizedException: HttpStatus.UNAUTHORIZED,
      ServiceUnavailableException: HttpStatus.SERVICE_UNAVAILABLE,
    };

    const name = exception instanceof Error ? exception.constructor.name : '';
    const status =
      STATUS_MAP[name] ??
      (exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR);

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const detail =
      exception instanceof HttpException
        ? ((exceptionResponse as { message?: string }).message ??
          exception.message)
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    response
      .status(status)
      .contentType('application/problem+json')
      .json({
        type: `https://httpstatuses.com/${status}`,
        title: HttpStatus[status],
        status,
        detail,
        instance: request.url,
      });
  }
}
