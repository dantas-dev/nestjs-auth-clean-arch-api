import { findUserById } from 'src/application/helpers';
import { USER_DETAILS_CACHE_TTL } from 'src/domain/consts';
import { UserEntity } from 'src/domain/entities/user.entity';
import type { IUserRepository } from 'src/domain/repositories/user-repository.interface';
import { ICacheService } from 'src/domain/services';

export class FindUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cacheService: ICacheService,
  ) {}

  async execute(userId: number): Promise<UserEntity> {
    const cacheKey = `user:${userId}`;
    const cached = await this.cacheService.get<UserEntity>(cacheKey);

    if (cached) {
      return cached;
    }

    const user = await findUserById(this.userRepository, userId);
    await this.cacheService.set<UserEntity>(
      cacheKey,
      user,
      USER_DETAILS_CACHE_TTL,
    );
    return user;
  }
}
