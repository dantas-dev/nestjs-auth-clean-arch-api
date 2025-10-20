import { Injectable } from '@nestjs/common';
import { randomBytes, scryptSync } from 'node:crypto';

import type { IHashService } from 'src/domain/services';

@Injectable()
export class ScryptHashService implements IHashService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');

    return Promise.resolve(`${salt}.${hash}`);
  }

  async compare(password: string, hashed: string): Promise<boolean> {
    const [salt, hash] = hashed.split('.');
    const result = scryptSync(password, salt, 64).toString('hex');
    return Promise.resolve(result === hash);
  }
}
