import { UserEntity } from 'src/domain/entities/user.entity';
import { IUserRepository } from 'src/domain/repositories/user-repository.interface';
import { PaginatedResult } from 'src/domain/types';

export class InMemoryUserRepository implements IUserRepository {
  private users: UserEntity[] = [];
  private nextId = 1;

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = new UserEntity();

    Object.assign(user, {
      id: this.nextId++,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    this.users.push(user);
    return Promise.resolve(user);
  }

  async update(id: number, data: Partial<UserEntity>): Promise<UserEntity> {
    const user = await this.findById(id);

    if (!user) throw new Error('User not found');
    Object.assign(user, { ...data, updatedAt: new Date() });

    return user;
  }

  async delete(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');

    user.deletedAt = new Date();
  }

  async findById(id: number): Promise<UserEntity | null> {
    return Promise.resolve(
      this.users.find((u) => u.id === id && !u.deletedAt) ?? null,
    );
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return Promise.resolve(
      this.users.find((u) => u.email === email && !u.deletedAt) ?? null,
    );
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserEntity>> {
    const activeUsers = this.users.filter((user) => !user.deletedAt);
    const total = activeUsers.length;
    const data = activeUsers.slice((page - 1) * limit, page * limit);

    return Promise.resolve({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
}
