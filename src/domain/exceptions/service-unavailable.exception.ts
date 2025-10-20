import { AppError } from './app-error.exception';

export class ServiceUnavailableException extends AppError {
  constructor(details: object) {
    super(`Service degraded: ${JSON.stringify(details)}`);
  }
}
