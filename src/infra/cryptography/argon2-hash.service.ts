import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import type { IHashService } from 'src/domain/services';

@Injectable()
export class Argon2HashService implements IHashService {
  async hash(value: string): Promise<string> {
    return argon2.hash(value);
  }

  async compare(value: string, hashed: string): Promise<boolean> {
    return argon2.verify(hashed, value);
  }
}
