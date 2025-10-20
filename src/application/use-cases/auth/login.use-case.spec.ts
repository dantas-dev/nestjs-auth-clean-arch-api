import { InMemoryUserRepository } from 'src/infra/database/repositories/in-memory-user.repository';
import { UnauthorizedException } from 'src/domain/exceptions';

import { LoginUseCase } from './login.use-case';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let repository: InMemoryUserRepository;

  const mockHashService = {
    hash: (value: string) => Promise.resolve(`hashed_${value}`),
    compare: (value: string, hashed: string) =>
      Promise.resolve(hashed === `hashed_${value}`),
  };

  const mockTokenService = {
    sign: () => 'access_token',
    signRefresh: () => 'refresh_token',
    verify: () => ({ sub: 1, email: 'test@mail.com', type: 'access' as const }),
  };

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    useCase = new LoginUseCase(repository, mockHashService, mockTokenService);

    await repository.create({
      name: 'John',
      email: 'john@mail.com',
      password: 'hashed_123456',
    });
  });

  it('should return tokens on valid login', async () => {
    const result = await useCase.execute('john@mail.com', '123456');

    expect(result.accessToken).toBe('access_token');
    expect(result.refreshToken).toBe('refresh_token');
  });

  it('should throw UnauthorizedException if email not found', async () => {
    await expect(
      useCase.execute('notfound@mail.com', '123456'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if password is wrong', async () => {
    await expect(
      useCase.execute('john@mail.com', 'wrongpassword'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
