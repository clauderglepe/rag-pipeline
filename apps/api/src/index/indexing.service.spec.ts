// src/index/indexing.service.spec.ts
import { NotFoundException } from '@nestjs/common';
import { IndexingService } from './indexing.service';
import { ChunkRepository, Chunk } from '../ingestion/chunk-repository.interface';
import { EmbeddingProvider } from './embedding-provider.interface';
import { VectorIndex } from './vector-index.interface';

function makeChunk(overrides: Partial<Chunk> = {}): Chunk {
  return {
    id: 'doc-1:0',
    documentId: 'doc-1',
    index: 0,
    text: 'texto de prueba',
    startOffset: 0,
    endOffset: 10,
    page: 1,
    ...overrides,
  };
}

describe('IndexingService', () => {
  let service: IndexingService;
  let chunkRepository: jest.Mocked<ChunkRepository>;
  let embeddingProvider: jest.Mocked<EmbeddingProvider>;
  let vectorIndex: jest.Mocked<VectorIndex>;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    chunkRepository = { save: jest.fn(), findByDocumentId: jest.fn() } as any;
    embeddingProvider = { embed: jest.fn() } as any;
    vectorIndex = { add: jest.fn(), search: jest.fn() } as any;
    configService = { get: jest.fn().mockReturnValue(2) }; // batch size = 2

    service = new IndexingService(chunkRepository, embeddingProvider, vectorIndex, configService as any);
  });

  it('lanza NotFoundException si el documento no existe', async () => {
    chunkRepository.findByDocumentId.mockResolvedValue([]);

    await expect(service.indexDocument('no-existe')).rejects.toThrow(NotFoundException);
  });

  it('procesa los chunks en lotes según EMBEDDING_BATCH_SIZE', async () => {
    const chunks = [
      makeChunk({ id: 'c0', index: 0 }),
      makeChunk({ id: 'c1', index: 1 }),
      makeChunk({ id: 'c2', index: 2 }),
    ];
    chunkRepository.findByDocumentId.mockResolvedValue(chunks);
    embeddingProvider.embed.mockResolvedValue([
      [1, 0],
      [0, 1],
    ]);

    const result = await service.indexDocument('doc-1');

    // 3 chunks, batch size 2 => lotes de [2, 1] => 2 llamadas a embed()
    expect(embeddingProvider.embed).toHaveBeenCalledTimes(2);
    expect(embeddingProvider.embed).toHaveBeenNthCalledWith(1, ['texto de prueba', 'texto de prueba']);
    expect(result.embeddedCount).toBe(3);
  });

  it('asocia cada vector con el chunkId correcto por posición', async () => {
    const chunks = [makeChunk({ id: 'c0' }), makeChunk({ id: 'c1' })];
    chunkRepository.findByDocumentId.mockResolvedValue(chunks);
    embeddingProvider.embed.mockResolvedValue([
      [1, 0],
      [0, 1],
    ]);

    await service.indexDocument('doc-1');

    expect(vectorIndex.add).toHaveBeenCalledWith([
      { chunkId: 'c0', documentId: 'doc-1', vector: [1, 0] },
      { chunkId: 'c1', documentId: 'doc-1', vector: [0, 1] },
    ]);
  });
});