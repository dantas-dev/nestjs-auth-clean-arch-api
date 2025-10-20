import { UserEntity } from 'src/domain/entities/user.entity';
import { NotFoundException } from 'src/domain/exceptions';
import { InMemoryUserRepository } from 'src/infra/database/repositories/in-memory-user.repository';

import { FindUserUseCase } from './find-user.use-case';
import { mockCacheService } from './__mocks__/cache-service.mock';

describe('FindUserUseCase', () => {
  let useCase: FindUserUseCase;
  let repository: InMemoryUserRepository;
  let currentUser: UserEntity;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    useCase = new FindUserUseCase(repository, mockCacheService);

    currentUser = await repository.create({
      id: 1,
      name: 'Jhon Doe',
      email: 'jhondoe@mail.com',
      password: '123456',
    });
  });

  it('should find a user', async () => {
    const user = await useCase.execute(currentUser.id);

    expect(user).toBe(currentUser);
  });

  it('should throw NotFoundException if user not exists', async () => {
    const idNotExists = -10;
    await expect(useCase.execute(idNotExists)).rejects.toThrow(
      NotFoundException,
    );
  });
});
