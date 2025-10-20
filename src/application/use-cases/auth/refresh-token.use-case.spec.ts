import { UnauthorizedException } from 'src/domain/exceptions';
import { RefreshTokenUseCase } from './refresh-token.use-case';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;

  const mockTokenService = {
    sign: () => 'new_access_token',
    signRefresh: () => 'new_refresh_token',
    verify: (token: string) => {
      if (token === 'valid_refresh')
        return { sub: 1, email: 'john@mail.com', type: 'refresh' as const };
      if (token === 'valid_access')
        return { sub: 1, email: 'john@mail.com', type: 'access' as const };
      throw new Error('invalid token');
    },
  };

  beforeEach(() => {
    useCase = new RefreshTokenUseCase(mockTokenService);
  });

  it('should return new tokens with valid refresh token', () => {
    const result = useCase.execute('valid_refresh');

    expect(result.accessToken).toBe('new_access_token');
    expect(result.refreshToken).toBe('new_refresh_token');
  });

  it('should throw UnauthorizedException if token is access type', () => {
    expect(() => useCase.execute('valid_access')).toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if token is invalid', () => {
    expect(() => useCase.execute('invalid_token')).toThrow(
      UnauthorizedException,
    );
  });
});
