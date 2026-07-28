import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import path from 'path';
import { AppModule } from '../src/app.module';
import { EnvironmentVariables } from '../src/config/env.validation';

describe('Lexical Index (e2e)', () => {
  let app: INestApplication;
 
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const configService = moduleFixture.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  
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

  it('indexa un documento real y permite buscarlo léxicamente', async () => {

    const documentId = await ingestFixture();

    const indexResponse = await request(app.getHttpServer())
      .post(`/documents/${documentId}/index/lexical`)
      .expect(201);

    expect(indexResponse.body.indexedCount).toBeGreaterThan(0);

    const searchResponse = await request(app.getHttpServer())
      .post(`/documents/${documentId}/debug/lexical-search`)
      .send({ query: 'AWS', topK: 3 })
      .expect(200);

    expect(searchResponse.body.length).toBeGreaterThan(0);
    expect(searchResponse.body.length).toBeLessThanOrEqual(3);

    for (const result of searchResponse.body) {
      expect(result.score).toBeGreaterThan(-1);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.page).toBeGreaterThanOrEqual(1);
    }
  });

  it('responde 404 al indexar un documentId inexistente', async () => {
 
    await request(app.getHttpServer()).post('/documents/no-existe-123/index/lexical').expect(404);
  });

  it('responde 200 con lista vacía al buscar en un documento ingerido pero no indexado', async () => {
  
    const documentId = await ingestFixture(); // se ingiere, pero deliberadamente NO se indexa

    const response = await request(app.getHttpServer())
      .post(`/documents/${documentId}/debug/lexical-search`)
      .send({ query: 'cualquier cosa' })
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('reindexar el mismo documento es idempotente (regresión del bug de duplicados)', async () => {
  
    const documentId = await ingestFixture();

    await request(app.getHttpServer()).post(`/documents/${documentId}/index/lexical`).expect(201);
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/lexical`).expect(201);

    const searchResponse = await request(app.getHttpServer())
      .post(`/documents/${documentId}/debug/lexical-search`)
      .send({ query: 'AWS', topK: 50 }) // topK alto: si hubiera duplicados, aparecerían
      .expect(200);

    const chunkIds = searchResponse.body.map((r: { chunkId: string }) => r.chunkId);
    const uniqueChunkIds = new Set(chunkIds);

    // Si el bug de la tarea anterior reapareciera, este assert fallaría:
    // habría más entradas que chunkIds únicos.
    expect(chunkIds.length).toBe(uniqueChunkIds.size);
  });
});