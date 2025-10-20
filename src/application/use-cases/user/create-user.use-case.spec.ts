import { InMemoryUserRepository } from 'src/infra/database/repositories/in-memory-user.repository';
import { AlreadyExistsException } from 'src/domain/exceptions';

import { CreateUserUseCase } from './create-user.use-case';
import { mockCacheService } from './__mocks__/cache-service.mock';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let repository: InMemoryUserRepository;

  const mockHashService = {
    hash: (value: string) => Promise.resolve(`hashed_${value}`),
    compare: (value: string, hashed: string) =>
      Promise.resolve(hashed === `hashed_${value}`),
  };

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    useCase = new CreateUserUseCase(
      repository,
      mockHashService,
      mockCacheService,
    );
  });

  it('should create a user', async () => {
    const user = await useCase.execute({
      name: 'John',
      email: 'john@mail.com',
      password: '123456',
    });

    expect(user.name).toBe('John');
    expect(user.email).toBe('john@mail.com');
    expect(user.password).toBe('hashed_123456');
  });

  it('should throw AlreadyExistsException if email exists', async () => {
    await useCase.execute({
      name: 'John',
      email: 'john@mail.com',
      password: '123456',
    });

    await expect(
      useCase.execute({
        name: 'Jane',
        email: 'john@mail.com',
        password: '654321',
      }),
    ).rejects.toThrow(AlreadyExistsException);
  });
});
