import { ICacheService } from 'src/domain/services';
import { findUserById } from 'src/application/helpers';
import type { IUserRepository } from 'src/domain/repositories/user-repository.interface';

export class DeleteUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cacheService: ICacheService,
  ) {}

  async execute(userId: number) {
    await findUserById(this.userRepository, userId);
    await this.userRepository.delete(userId);

    const cacheKey = `user:${userId}`;
    await this.cacheService.delete(cacheKey);
    await this.cacheService.deleteByPrefix('users:page:');
  }
}
