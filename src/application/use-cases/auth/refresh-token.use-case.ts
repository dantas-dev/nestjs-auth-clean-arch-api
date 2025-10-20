import { UnauthorizedException } from 'src/domain/exceptions';
import type { ITokenService } from 'src/domain/services';

export class RefreshTokenUseCase {
  constructor(private readonly tokenService: ITokenService) {}

  execute(refreshToken: string) {
    try {
      const payload = this.tokenService.verify(refreshToken);

      const newPayload = { sub: payload.sub, email: payload.email };

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return {
        accessToken: this.tokenService.sign({ ...newPayload, type: 'access' }),
        refreshToken: this.tokenService.signRefresh({
          ...newPayload,
          type: 'refresh',
        }),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
