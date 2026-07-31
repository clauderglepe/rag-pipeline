import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import path from 'path';
import { AppModule } from '../src/app.module';

describe('Lexical Index (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function ingestFixture(): Promise<string> {
    const fixturePath = path.join(__dirname, 'fixtures/sample.pdf');
    const response = await request(app.getHttpServer())
      .post('/documents')
      .attach('file', fixturePath)
      .expect(201);

    return response.body.documentId;
  }

  it('indexa un documento real léxicamente', async () => {
    const documentId = await ingestFixture();

    const indexResponse = await request(app.getHttpServer())
      .post(`/documents/${documentId}/index/lexical`)
      .expect(201);

    expect(indexResponse.body.indexedCount).toBeGreaterThan(0);

    // Ídem: búsqueda léxica end-to-end + idempotencia se prueban ahora en
    // hybrid-search.e2e-spec.ts (Fase 4, tarea 8).
  });

  it('responde 404 al indexar un documentId inexistente', async () => {
    await request(app.getHttpServer()).post('/documents/no-existe-123/index/lexical').expect(404);
  });

  it('el endpoint de debug retirado ya no responde', async () => {
    const documentId = await ingestFixture();

    await request(app.getHttpServer())
      .post(`/documents/${documentId}/debug/lexical-search`)
      .send({ query: 'algo' })
      .expect(404);
  });
});