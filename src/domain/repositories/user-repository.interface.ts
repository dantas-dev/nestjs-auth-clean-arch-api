import { PaginatedResult } from '../types';
import { UserEntity } from '../entities/user.entity';

export interface IUserRepository {
  create(data: Partial<UserEntity>): Promise<UserEntity>;
  update(id: number, data: Partial<UserEntity>): Promise<UserEntity>;
  delete(id: number): Promise<void>;
  findAll(page: number, limit: number): Promise<PaginatedResult<UserEntity>>;
  findById(id: number): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
}
