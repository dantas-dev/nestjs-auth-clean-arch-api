import { UserEntity } from 'src/domain/entities/user.entity';
import type { IHashService } from 'src/domain/services/hash-service.interface';
import type { IUserRepository } from 'src/domain/repositories/user-repository.interface';

import { UpdateUserInput } from 'src/application/types';
import { ICacheService } from 'src/domain/services';
import { checkEmailExists, findUserById } from 'src/application/helpers';
import { USER_DETAILS_CACHE_TTL } from 'src/domain/consts';

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly cacheService: ICacheService,
  ) {}

  async execute(userId: number, data: UpdateUserInput): Promise<UserEntity> {
    await findUserById(this.userRepository, userId);
    if (data.email) {
      await checkEmailExists(this.userRepository, data.email, userId);
    }

    if (data.password) {
      data.password = await this.hashService.hash(data.password);
    }

    await this.userRepository.update(userId, data);
    const user = await findUserById(this.userRepository, userId);

    const cacheKey = `user:${user.id}`;
    await this.cacheService.set<UserEntity>(
      cacheKey,
      user,
      USER_DETAILS_CACHE_TTL,
    );
    await this.cacheService.deleteByPrefix('users:page:');

    return user;
  }
}
