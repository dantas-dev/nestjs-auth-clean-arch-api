import { UserEntity } from 'src/domain/entities/user.entity';
import { NotFoundException } from 'src/domain/exceptions';
import { InMemoryUserRepository } from 'src/infra/database/repositories/in-memory-user.repository';

import { DeleteUserUseCase } from './delete-user.use-case';
import { mockCacheService } from './__mocks__/cache-service.mock';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let repository: InMemoryUserRepository;
  let currentUser: UserEntity;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    useCase = new DeleteUserUseCase(repository, mockCacheService);

    currentUser = await repository.create({
      id: 1,
      name: 'Jhon Doe',
      email: 'jhondoe@mail.com',
      password: '123456',
    });
  });

  it('should softdelete a user', async () => {
    expect(currentUser.deletedAt).toBeNull();

    await useCase.execute(currentUser.id);

    expect(currentUser.deletedAt).not.toBe(null);
  });

  it('should throw NotFoundException if user not exists', async () => {
    const idNotExists = -10;
    await expect(useCase.execute(idNotExists)).rejects.toThrow(
      NotFoundException,
    );
  });
});
