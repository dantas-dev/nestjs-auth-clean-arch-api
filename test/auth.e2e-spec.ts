import request from 'supertest';
import { type App } from 'supertest/types';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppModule } from 'src/app.module';
import { AllExceptionsFilter } from 'src/presentation/filters/all-exception.filter';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let refreshToken: string;
  let accessToken: string;

  beforeAll(async () => {
    process.env.ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    app.enableShutdownHooks();
    await app.init();

    const dataSource = app.get(DataSource);
    await dataSource.query('DELETE FROM users');

    await request(app.getHttpServer() as App)
      .post('/users')
      .send({ name: 'John', email: 'john@mail.com', password: '123456' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login -- should return tokens', async () => {
    const res = await request(app.getHttpServer() as App)
      .post('/auth/login')
      .send({ email: 'john@mail.com', password: '123456' })
      .expect(201);

    const body = res.body as { accessToken: string; refreshToken: string };
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;

    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
  });

  it('POST /auth/login -- should return 401 with wrong email', async () => {
    await request(app.getHttpServer() as App)
      .post('/auth/login')
      .send({ email: 'wrong@mail.com', password: '123456' })
      .expect(401);
  });

  it('POST /auth/login -- should return 401 with wrong password', async () => {
    await request(app.getHttpServer() as App)
      .post('/auth/login')
      .send({ email: 'john@mail.com', password: 'wrongpassword' })
      .expect(401);
  });

  it('POST /auth/refresh-token -- should return new tokens', async () => {
    const res = await request(app.getHttpServer() as App)
      .post('/auth/refresh-token')
      .send({ refreshToken })
      .expect(201);

    const body = res.body as { accessToken: string; refreshToken: string };
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it('POST /auth/refresh-token -- should reject access token', async () => {
    await request(app.getHttpServer() as App)
      .post('/auth/refresh-token')
      .send({ refreshToken: accessToken })
      .expect(401);
  });

  it('POST /auth/refresh-token -- should reject invalid token', async () => {
    await request(app.getHttpServer() as App)
      .post('/auth/refresh-token')
      .send({ refreshToken: 'invalid_token' })
      .expect(401);
  });
});
