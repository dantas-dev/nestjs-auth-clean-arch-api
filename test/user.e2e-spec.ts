import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from 'src/app.module';
import { AllExceptionsFilter } from 'src/presentation/filters/all-exception.filter';

describe('User (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let createdUserId: number;

  beforeAll(async () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /users -- should create a user', async () => {
    const res = await request(app.getHttpServer() as App)
      .post('/users')
      .send({ name: 'John', email: 'john@mail.com', password: '123456' })
      .expect(201);

    const body = res.body as { id: number; name: string; password?: string };
    createdUserId = body.id;
    expect(body.name).toBe('John');
    expect(body.password).toBeUndefined();
  });

  it('POST /auth/login -- should login to get token', async () => {
    const res = await request(app.getHttpServer() as App)
      .post('/auth/login')
      .send({ email: 'john@mail.com', password: '123456' })
      .expect(201);

    const body = res.body as { accessToken: string };
    accessToken = body.accessToken;
    expect(accessToken).toBeDefined();
  });

  it('GET /users -- should return paginated list', async () => {
    await request(app.getHttpServer() as App)
      .get('/users?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: { data: unknown[]; meta: { total: number } } }) => {
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.meta.total).toBeGreaterThan(0);
      });
  });

  it('GET /users/:id -- should return a user', async () => {
    await request(app.getHttpServer() as App)
      .get(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: { body: { id: number; name: string } }) => {
        expect(res.body.id).toBe(createdUserId);
        expect(res.body.name).toBe('John');
      });
  });

  it('PATCH /users/:id -- should update a user', async () => {
    await request(app.getHttpServer() as App)
      .patch(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'John Updated' })
      .expect(200)
      .expect((res: { body: { name: string } }) => {
        expect(res.body.name).toBe('John Updated');
      });
  });

  it('DELETE /users/:id -- should soft delete a user', async () => {
    await request(app.getHttpServer() as App)
      .delete(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });

  it('GET /users -- should return 401 without token', async () => {
    await request(app.getHttpServer() as App)
      .get('/users')
      .expect(401);
  });

  it('GET /users/:id -- should return 401 without token', async () => {
    await request(app.getHttpServer() as App)
      .get(`/users/${createdUserId}`)
      .expect(401);
  });
});
