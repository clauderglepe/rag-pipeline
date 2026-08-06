// apps/api/test/rag-query.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import path from 'path';
import { AppModule } from '../src/app.module';
import { EnvironmentVariables } from '../src/config/env.validation';
import { isOllamaAvailable } from './utils/ollama-availability';

jest.setTimeout(180_000); // generación de texto puede tardar más que embeddings

describe('RAG Query (e2e)', () => {
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
        `⚠️  Ollama no responde en ${baseUrl} — los tests de RAG query se omiten. ` +
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

  it('responde una pregunta real con contexto del documento', async () => {
    if (!ollamaAvailable) return;

    const documentId = await ingestFixture();
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/semantic`).expect(201);
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/lexical`).expect(201);

    const response = await request(app.getHttpServer())
      .post(`/documents/${documentId}/query`)
      .send({ query: '¿Qué es AWS?' })
      .expect(200);

    expect(typeof response.body.answer).toBe('string');
    expect(response.body.answer.length).toBeGreaterThan(0);

    expect(Array.isArray(response.body.sources)).toBe(true);
    expect(response.body.sources.length).toBeGreaterThan(0);

    for (const source of response.body.sources) {
      expect(source.page).toBeGreaterThanOrEqual(1);
      expect(['semantic', 'lexical']).toEqual(
        expect.arrayContaining(source.foundIn.length ? [source.foundIn[0]] : []),
      );
    }
  });

  it('responde 404 al preguntar sobre un documentId inexistente', async () => {
    if (!ollamaAvailable) return;

    await request(app.getHttpServer())
      .post('/documents/no-existe-123/query')
      .send({ query: 'algo' })
      .expect(404);
  });

  it('devuelve el mensaje de "sin contexto" si el documento no fue indexado', async () => {
    if (!ollamaAvailable) return; // igual necesita Ollama: RetrievalService embebe la query aunque el doc no tenga vectores

    const documentId = await ingestFixture(); // ingerido, deliberadamente sin indexar

    const response = await request(app.getHttpServer())
      .post(`/documents/${documentId}/query`)
      .send({ query: 'cualquier cosa' })
      .expect(200);

    expect(response.body.answer).toContain('No hay contenido indexado');
    expect(response.body.sources).toEqual([]);
  });

  it('funciona con un documento indexado en un solo índice', async () => {
    if (!ollamaAvailable) return;

    const documentId = await ingestFixture();
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/lexical`).expect(201);
    // deliberadamente sin indexar semánticamente

    const response = await request(app.getHttpServer())
      .post(`/documents/${documentId}/query`)
      .send({ query: 'AWS' })
      .expect(200);

    expect(response.body.answer.length).toBeGreaterThan(0);
    for (const source of response.body.sources) {
      expect(source.foundIn).toEqual(['lexical']);
    }
  });

  it('preserva la pregunta tal cual llega hasta el LLM (sin recortar espacios)', async () => {
    if (!ollamaAvailable) return;

    const documentId = await ingestFixture();
    await request(app.getHttpServer()).post(`/documents/${documentId}/index/lexical`).expect(201);

    // No podemos inspeccionar el prompt real enviado a Ollama desde el e2e,
    // pero sí confirmar que una query con espacios raros no rompe el pipeline
    // (la cobertura de que NO se recorta ya está en query-request.dto.spec.ts
    // y prompt-builder.spec.ts, a nivel unitario — acá solo verificamos que
    // el camino completo no falla con ese input).
    await request(app.getHttpServer())
      .post(`/documents/${documentId}/query`)
      .send({ query: '  AWS  ' })
      .expect(200);
  });
});