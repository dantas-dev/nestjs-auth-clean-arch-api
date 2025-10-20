import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';

import type { ITokenService, TokenPayload } from 'src/domain/services';

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(payload: TokenPayload): string {
    return this.jwtService.sign({ ...payload, type: 'access' });
  }

  signRefresh(payload: TokenPayload): string {
    return this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: '7d' },
    );
  }

  verify(token: string): TokenPayload {
    return this.jwtService.verify<TokenPayload>(token);
  }
}
