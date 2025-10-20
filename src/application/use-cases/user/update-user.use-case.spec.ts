import { UserEntity } from 'src/domain/entities/user.entity';
import { AlreadyExistsException } from 'src/domain/exceptions';
import { InMemoryUserRepository } from 'src/infra/database/repositories/in-memory-user.repository';

import { UpdateUserUseCase } from './update-user.use-case';
import { mockCacheService } from './__mocks__/cache-service.mock';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let repository: InMemoryUserRepository;
  let currentUser: UserEntity;

  const mockHashService = {
    hash: (value: string) => Promise.resolve(`hashed_${value}`),
    compare: (value: string, hashed: string) =>
      Promise.resolve(hashed === `hashed_${value}`),
  };

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    useCase = new UpdateUserUseCase(
      repository,
      mockHashService,
      mockCacheService,
    );

    currentUser = await repository.create({
      id: 1,
      name: 'Jhon Doe',
      email: 'jhondoe@mail.com',
      password: '123456',
    });
  });

  it('should update a user', async () => {
    expect(currentUser.name).toBe('Jhon Doe');
    expect(currentUser.email).toBe('jhondoe@mail.com');

    const updatedUser = await useCase.execute(currentUser.id, {
      name: 'Updated User',
      email: 'updated@mail.com',
    });

    expect(updatedUser.name).toBe('Updated User');
    expect(updatedUser.email).toBe('updated@mail.com');
  });

  it('should hash password on update', async () => {
    const updated = await useCase.execute(currentUser.id, {
      password: 'newpass',
    });
    expect(updated.password).toBe('hashed_newpass');
  });

  it('should throw AlreadyExistsException if email exists', async () => {
    const otherUser = await repository.create({
      name: 'Jane',
      email: 'jane@mail.com',
      password: '123456',
    });

    await expect(
      useCase.execute(currentUser.id, {
        name: 'Jane',
        email: otherUser.email,
        password: '654321',
      }),
    ).rejects.toThrow(AlreadyExistsException);
  });
});
