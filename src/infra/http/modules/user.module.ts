import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  FindUserUseCase,
  DeleteUserUseCase,
  CreateUserUseCase,
  UpdateUserUseCase,
  FindAllUserUseCase,
} from 'src/application/use-cases';

import { UserModel } from 'src/infra/database/models/user.model';
import { TypeORMUserRepository } from 'src/infra/database/repositories/typeorm-user.repository';
import { Argon2HashService } from 'src/infra/cryptography/argon2-hash.service';

import { ICacheService, IHashService } from 'src/domain/services';
import { IUserRepository } from 'src/domain/repositories/user-repository.interface';
import { UserController } from 'src/presentation/controllers/user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserModel])],
  controllers: [UserController],
  providers: [
    {
      provide: FindUserUseCase,
      useFactory: (
        userRepository: IUserRepository,
        cacheService: ICacheService,
      ) => new FindUserUseCase(userRepository, cacheService),
      inject: ['IUserRepository', 'ICacheService'],
    },
    {
      provide: CreateUserUseCase,
      useFactory: (
        userRepository: IUserRepository,
        hashService: IHashService,
        cacheService: ICacheService,
      ) => new CreateUserUseCase(userRepository, hashService, cacheService),
      inject: ['IUserRepository', 'IHashService', 'ICacheService'],
    },
    {
      provide: UpdateUserUseCase,
      useFactory: (
        userRepository: IUserRepository,
        hashService: IHashService,
        cacheService: ICacheService,
      ) => new UpdateUserUseCase(userRepository, hashService, cacheService),
      inject: ['IUserRepository', 'IHashService', 'ICacheService'],
    },
    {
      provide: FindAllUserUseCase,
      useFactory: (
        userRepository: IUserRepository,
        cacheService: ICacheService,
      ) => new FindAllUserUseCase(userRepository, cacheService),
      inject: ['IUserRepository', 'ICacheService'],
    },
    {
      provide: DeleteUserUseCase,
      useFactory: (
        userRepository: IUserRepository,
        cacheService: ICacheService,
      ) => new DeleteUserUseCase(userRepository, cacheService),
      inject: ['IUserRepository', 'ICacheService'],
    },
    {
      provide: 'IUserRepository',
      useClass: TypeORMUserRepository,
    },
    {
      provide: 'IHashService',
      useClass: Argon2HashService,
    },
  ],
  exports: [],
})
export class UserModule {}
