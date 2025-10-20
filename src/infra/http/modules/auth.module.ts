import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModel } from 'src/infra/database/models/user.model';
import { Argon2HashService, JwtTokenService } from 'src/infra/cryptography';
import { LoginUseCase, RefreshTokenUseCase } from 'src/application/use-cases';
import { TypeORMUserRepository } from 'src/infra/database/repositories/typeorm-user.repository';

import { IUserRepository } from 'src/domain/repositories/user-repository.interface';
import { AuthController } from 'src/presentation/controllers/auth.controller';
import { IHashService, ITokenService } from 'src/domain/services';

@Module({
  imports: [TypeOrmModule.forFeature([UserModel])],
  controllers: [AuthController],
  providers: [
    {
      provide: LoginUseCase,
      useFactory: (
        userRepository: IUserRepository,
        hashService: IHashService,
        tokenService: ITokenService,
      ) => new LoginUseCase(userRepository, hashService, tokenService),
      inject: ['IUserRepository', 'IHashService', 'ITokenService'],
    },
    {
      provide: RefreshTokenUseCase,
      useFactory: (tokenService: ITokenService) =>
        new RefreshTokenUseCase(tokenService),
      inject: ['ITokenService'],
    },
    {
      provide: 'IUserRepository',
      useClass: TypeORMUserRepository,
    },
    {
      provide: 'IHashService',
      useClass: Argon2HashService,
    },
    {
      provide: 'ITokenService',
      useClass: JwtTokenService,
    },
  ],
  exports: [],
})
export class AuthModule {}
