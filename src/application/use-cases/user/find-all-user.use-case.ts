import { PaginatedResult } from 'src/domain/types';
import { ICacheService } from 'src/domain/services';
import { USER_LIST_CACHE_TTL } from 'src/domain/consts';
import { UserEntity } from 'src/domain/entities/user.entity';
import type { IUserRepository } from 'src/domain/repositories/user-repository.interface';

export class FindAllUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cacheService: ICacheService,
  ) {}

  async execute(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserEntity>> {
    const cacheKey = `users:page:${page}:limit:${limit}`;
    const cached =
      await this.cacheService.get<PaginatedResult<UserEntity>>(cacheKey);

    if (cached) {
      return cached;
    }

    const users = await this.userRepository.findAll(page, limit);
    await this.cacheService.set<PaginatedResult<UserEntity>>(
      cacheKey,
      users,
      USER_LIST_CACHE_TTL,
    );
    return users;
  }
}
