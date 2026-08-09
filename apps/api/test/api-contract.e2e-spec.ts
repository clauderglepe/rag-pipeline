// apps/api/test/rag-query.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';

describe('Swagger UI (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/docs sirve la documentación Swagger', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
  });
 
  it('rechaza un DTO con tipo incorrecto, con la forma de error estandarizada', async () => {
    const response = await request(app.getHttpServer())
      .post('/documents/cualquier-id/search')
      .send({ query: 'algo', topK: 'no-es-un-numero' })
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 400,
        error: 'BAD_REQUEST',
        path: '/documents/cualquier-id/search',
      }),
    );
    expect(response.body).toHaveProperty('timestamp');
  });

  it('rechaza una propiedad no declarada en el DTO (forbidNonWhitelisted)', async () => {
    await request(app.getHttpServer())
      .post('/documents/cualquier-id/query')
      .send({ query: 'algo', propiedadInventada: 'x' })
      .expect(400);
  });

  it('responde 404 con exactamente la misma forma de error que un 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/documents/no-existe-123/index/semantic')
      .expect(404);

    expect(response.body).toEqual(
      expect.objectContaining({ statusCode: 404, error: 'NOT_FOUND' }),
    );
    expect(Object.keys(response.body).sort()).toEqual(
      ['statusCode', 'message', 'error', 'timestamp', 'path'].sort(),
    );
  });

  it('un body vacío en un endpoint que requiere DTO responde 400, no 500', async () => {
    await request(app.getHttpServer()).post('/documents/cualquier-id/query').send({}).expect(400);
  });

});
