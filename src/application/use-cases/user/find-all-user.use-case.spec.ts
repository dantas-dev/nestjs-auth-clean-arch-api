import { InMemoryUserRepository } from 'src/infra/database/repositories/in-memory-user.repository';

import { FindAllUserUseCase } from './find-all-user.use-case';
import { mockCacheService } from './__mocks__/cache-service.mock';

describe('FindAllUserUseCase', () => {
  let useCase: FindAllUserUseCase;
  let repository: InMemoryUserRepository;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    useCase = new FindAllUserUseCase(repository, mockCacheService);

    await repository.create({
      name: 'User 1',
      email: 'user1@mail.com',
      password: '123456',
    });
    await repository.create({
      name: 'User 2',
      email: 'user2@mail.com',
      password: '123456',
    });
    await repository.create({
      name: 'User 3',
      email: 'user3@mail.com',
      password: '123456',
    });
  });

  it('should return paginated users', async () => {
    const result = await useCase.execute(1, 2);

    expect(result.data).toHaveLength(2);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(2);
    expect(result.meta.total).toBe(3);
    expect(result.meta.totalPages).toBe(2);
  });

  it('should return second page', async () => {
    const result = await useCase.execute(2, 2);

    expect(result.data).toHaveLength(1);
    expect(result.meta.page).toBe(2);
  });

  it('should return empty data if page exceeds total', async () => {
    const result = await useCase.execute(10, 2);

    expect(result.data).toHaveLength(0);
  });
});
