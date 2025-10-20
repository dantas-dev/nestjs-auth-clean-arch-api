import { UserEntity } from 'src/domain/entities/user.entity';
import { UserResponse } from 'src/domain/types';

export class UserPresenter {
  static toHTTP(user: UserEntity): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toHTTPMany(users: UserEntity[]): UserResponse[] {
    return users.map((u) => UserPresenter.toHTTP(u));
  }
}
