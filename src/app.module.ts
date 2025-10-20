import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import {
  UserModule,
  AuthModule,
  RedisModule,
  HealthModule,
} from 'src/infra/http/modules';
import { UserModel } from './infra/database/models/user.model';

import { RateLimitGuard } from './presentation/guards';
import { LoggerMiddleware } from './presentation/middleware';

import { AppService } from './app.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.P1_POSTGRES_HOST,
      port: Number(process.env.P1_POSTGRES_PORT),
      username: process.env.P1_POSTGRES_USER,
      password: process.env.P1_POSTGRES_PASS,
      database: process.env.P1_POSTGRES_DB,
      entities: [UserModel],
      synchronize: process.env.ENV === 'test',
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuthModule,
    HealthModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
