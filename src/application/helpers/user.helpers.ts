import { UserEntity } from 'src/domain/entities/user.entity';
import { IUserRepository } from 'src/domain/repositories/user-repository.interface';

import {
  NotFoundException,
  AlreadyExistsException,
} from 'src/domain/exceptions';

export async function findUserById(
  repository: IUserRepository,
  id: number,
): Promise<UserEntity> {
  const user = await repository.findById(id);

  if (!user) {
    throw new NotFoundException('User not found');
  }

  return user;
}

export async function checkEmailExists(
  repository: IUserRepository,
  email: string,
  ignoredUserId?: number,
): Promise<void> {
  const user = await repository.findByEmail(email);

  if (user && user.id !== ignoredUserId) {
    throw new AlreadyExistsException('Email already exists');
  }
}
