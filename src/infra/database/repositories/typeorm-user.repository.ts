import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';

import { PaginatedResult } from 'src/domain/types';
import { UserEntity } from 'src/domain/entities/user.entity';
import { IUserRepository } from 'src/domain/repositories/user-repository.interface';

import { UserModel } from '../models/user.model';

@Injectable()
export class TypeORMUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserModel)
    private readonly userRepository: Repository<UserModel>,
  ) {}

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async update(id: number, data: Partial<UserEntity>): Promise<UserEntity> {
    await this.userRepository.update(id, data);
    const user = await this.findById(id);
    if (!user) throw new Error('User not found after update');

    return user;
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);
    await this.userRepository.softDelete(id);
  }

  async findById(id: number): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserEntity>> {
    const [data, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
