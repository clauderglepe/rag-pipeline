import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import path from 'path';
import { AppModule } from '../src/app.module';
import { EnvironmentVariables } from '../src/config/env.validation';

// Timeout por defecto de Jest (5000ms) alcanza para tests con mocks, pero no para
// llamadas reales a Ollama: generar embeddings es inferencia real (no instantánea),
// y la primera llamada puede tardar más porque Ollama carga el modelo en memoria.
// Si tu libro real tiene muchos chunks y este valor se queda corto, subilo más —
// no hay una "cifra correcta" universal, depende de tu hardware y el tamaño del PDF.
jest.setTimeout(60_000);

async function isOllamaAvailable(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    return response.ok;
  } catch {
    return false;
  }
}

describe('Semantic Index (e2e)', () => {
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
        `⚠️  Ollama no responde en ${baseUrl} — los tests de indexación semántica se omiten. ` +
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

  it('indexa un documento real y permite buscarlo semánticamente', async () => {
    if (!ollamaAvailable) return;

    const documentId = await ingestFixture();

    const indexResponse = await request(app.getHttpServer())
      .post(`/documents/${documentId}/index/semantic`)
      .expect(201);

    expect(indexResponse.body.embeddedCount).toBeGreaterThan(0);

    const searchResponse = await request(app.getHttpServer())
      .post(`/documents/${documentId}/debug/semantic-search`)
      .send({ query: 'texto del documento', topK: 3 })
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
    if (!ollamaAvailable) return;

    await request(app.getHttpServer()).post('/documents/no-existe-123/index/semantic').expect(404);
  });

  it('responde 200 con lista vacía al buscar en un documento ingerido pero no indexado', async () => {
    if (!ollamaAvailable) return;

    const documentId = await ingestFixture(); // se ingiere, pero deliberadamente NO se indexa

    const response = await request(app.getHttpServer())
      .post(`/documents/${documentId}/debug/semantic-search`)
      .send({ query: 'cualquier cosa' })
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('reindexar el mismo documento es idempotente (regresión del bug de duplicados)', async () => {
    if (!ollamaAvailable) return;

    const documentId = await ingestFixture();

    await request(app.getHttpServer()).post(`/documents/${documentId}/index/semantic`).expect(201);
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/semantic`).expect(201);

    const searchResponse = await request(app.getHttpServer())
      .post(`/documents/${documentId}/debug/semantic-search`)
      .send({ query: 'texto del documento', topK: 50 }) // topK alto: si hubiera duplicados, aparecerían
      .expect(200);

    const chunkIds = searchResponse.body.map((r: { chunkId: string }) => r.chunkId);
    const uniqueChunkIds = new Set(chunkIds);

    // Si el bug de la tarea anterior reapareciera, este assert fallaría:
    // habría más entradas que chunkIds únicos.
    expect(chunkIds.length).toBe(uniqueChunkIds.size);
  });
});