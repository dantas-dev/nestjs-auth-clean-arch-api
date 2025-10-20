import { Request } from 'express';
import {
  createParamDecorator,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (field: string | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'] as Record<string, unknown>;

    if (user) {
      if (field) {
        return user[field];
      } else {
        return user;
      }
    } else {
      throw new NotFoundException(
        'User not found in Request. Use JWTAuthGuard to get the user.',
      );
    }
  },
);
