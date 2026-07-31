import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import path from 'path';
import { AppModule } from '../src/app.module';
import { EnvironmentVariables } from '../src/config/env.validation';
import { isOllamaAvailable } from './utils/ollama-availability';


jest.setTimeout(60_000);

describe('Hybrid Retrieval (e2e)', () => {
  let app: INestApplication;
  let ollamaAvailable: boolean;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const configService = moduleFixture.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
    const baseUrl = configService.get('OLLAMA_BASE_URL', { infer: true });

    ollamaAvailable = await isOllamaAvailable(baseUrl);

    if (!ollamaAvailable) {
      console.warn(
        `⚠️  Ollama no responde en ${baseUrl} — los tests de retrieval híbrido se omiten. ` +
        `Corré "docker compose up -d" para incluirlos.`,
      );
    }
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

  async function ingestAndIndexFully(): Promise<string> {
    const documentId = await ingestFixture();
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/semantic`).expect(201);
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/lexical`).expect(201);
    return documentId;
  }
  it('devuelve resultados fusionados con metadata y foundIn correctos', async () => {
    if (!ollamaAvailable) return;

    const documentId = await ingestAndIndexFully();

    const response = await request(app.getHttpServer())
      .post(`/documents/${documentId}/search`)
      .send({ query: 'AWS', topK: 5 })
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body.length).toBeLessThanOrEqual(5);

    for (const result of response.body) {
      expect(result.score).toBeGreaterThan(0);
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.page).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(result.foundIn)).toBe(true);
      expect(result.foundIn.length).toBeGreaterThan(0);
      for (const source of result.foundIn) {
        expect(['semantic', 'lexical']).toContain(source);
      }
    }

    for (let i = 0; i < response.body.length - 1; i += 1) {
      expect(response.body[i].score).toBeGreaterThanOrEqual(response.body[i + 1].score);
    }
  });
  it('responde 404 al buscar en un documentId inexistente', async () => {
    if (!ollamaAvailable) return;

    await request(app.getHttpServer())
      .post('/documents/no-existe-123/search')
      .send({ query: 'algo' })
      .expect(404);
  });
  it('funciona con un documento indexado en un solo índice (no exige ambos)', async () => {
    if (!ollamaAvailable) return;

    const documentId = await ingestFixture();
    // Deliberadamente solo léxico, sin indexar semánticamente.
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/lexical`).expect(201);

    const response = await request(app.getHttpServer())
      .post(`/documents/${documentId}/search`)
      .send({ query: 'AWS', topK: 5 })
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    for (const result of response.body) {
      expect(result.foundIn).toEqual(['lexical']);
    }
  });
  it('reindexar (semántico y léxico) es idempotente de punta a punta', async () => {
    if (!ollamaAvailable) return;

    const documentId = await ingestFixture();

    // Reindexamos cada índice dos veces — regresión del bug de duplicados
    // encontrado originalmente en la Fase 2 (ver design.md de 0003 §8).
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/semantic`).expect(201);
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/semantic`).expect(201);
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/lexical`).expect(201);
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/lexical`).expect(201);

    const response = await request(app.getHttpServer())
      .post(`/documents/${documentId}/search`)
      .send({ query: 'AWS', topK: 50 })
      .expect(200);

    const chunkIds = response.body.map((r: { chunkId: string }) => r.chunkId);
    const uniqueChunkIds = new Set(chunkIds);

    expect(chunkIds.length).toBe(uniqueChunkIds.size);
  });
});