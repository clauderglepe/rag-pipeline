import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Response } from 'supertest';
import path from 'path';
import { AppModule } from '../src/app.module';
import {
  CHUNK_REPOSITORY,
  ChunkRepository,
} from '../src/ingestion/chunk-repository.interface';
import { DocumentResponseDto } from 'src/ingestion/dto/document-response.dto';
describe('Ingestion (e2e)', () => {
  let app: INestApplication;
  let chunkRepository: ChunkRepository;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    chunkRepository = moduleFixture.get<ChunkRepository>(CHUNK_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /documents ingiere un PDF real y genera chunks recuperables', async () => {
    const fixturePath = path.join(__dirname, '/fixtures/sample.pdf');
    console.log(fixturePath);

    const response: Response = await request(app.getHttpServer())
      .post('/documents')
      .attach('file', fixturePath)
      .expect(201);
    const document: DocumentResponseDto = response.body as DocumentResponseDto;
    expect(document).toHaveProperty('documentId');
    expect(document.chunkCount).toBeGreaterThan(0);

    // Verificamos contra el propio repositorio, no solo contra la respuesta HTTP —
    // así confirmamos que lo que se guardó coincide con lo que se reportó.
    const savedChunks = await chunkRepository.findByDocumentId(
      document.documentId,
    );
    expect(savedChunks).toHaveLength(document.chunkCount);
    expect(savedChunks[0].documentId).toBe(document.documentId);
    expect(savedChunks[0].page).toBeGreaterThanOrEqual(1);
  });
  it('POST /documents rechaza un archivo que no es PDF con 400', async () => {
    const response: Response = await request(app.getHttpServer())
      .post('/documents')
      .attach('file', Buffer.from('esto no es un pdf'), 'nota.txt')
      .expect(400);

    expect(response.body.message).toBeDefined();
  });

  it('POST /documents rechaza un archivo mayor a 20MB con 413', async () => {
    const oversizedBuffer = Buffer.alloc(21 * 1024 * 1024, 'a');

    await request(app.getHttpServer())
      .post('/documents')
      .attach('file', oversizedBuffer, 'gigante.pdf')
      .expect(413);
  });

  it('POST /documents sin archivo responde 400', async () => {
    await request(app.getHttpServer()).post('/documents').expect(400);
  });
});
