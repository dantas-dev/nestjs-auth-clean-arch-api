import { UserEntity } from 'src/domain/entities/user.entity';
import type { IUserRepository } from 'src/domain/repositories/user-repository.interface';
import type { IHashService } from 'src/domain/services/hash-service.interface';

import { ICacheService } from 'src/domain/services';
import { USER_DETAILS_CACHE_TTL } from 'src/domain/consts';

import { CreateUserInput } from 'src/application/types';
import { checkEmailExists } from 'src/application/helpers';

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly cacheService: ICacheService,
  ) {}

  async execute(data: CreateUserInput): Promise<UserEntity> {
    await checkEmailExists(this.userRepository, data.email);

    data.password = await this.hashService.hash(data.password);

    const user = await this.userRepository.create(data);

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
