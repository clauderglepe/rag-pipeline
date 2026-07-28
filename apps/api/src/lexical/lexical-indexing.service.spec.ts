// src/lexical/lexical-indexing.service.spec.ts
import { NotFoundException } from '@nestjs/common';
import { LexicalIndexingService } from './lexical-indexing.service';
import { ChunkRepository, Chunk } from '../ingestion/chunk-repository.interface';
import { LexicalIndex } from './lexical-index.interface';

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

describe('LexicalIndexingService', () => {
  let service: LexicalIndexingService;
  let chunkRepository: jest.Mocked<ChunkRepository>;
  let lexicalIndex: jest.Mocked<LexicalIndex>;

  beforeEach(() => {
    chunkRepository = { save: jest.fn(), findByDocumentId: jest.fn() } as any;
    lexicalIndex = { add: jest.fn(), deleteByDocumentId: jest.fn(), search: jest.fn() } as any;

    service = new LexicalIndexingService(chunkRepository, lexicalIndex);
  });

  it('lanza NotFoundException si el documento no existe', async () => {
    chunkRepository.findByDocumentId.mockResolvedValue([]);

    await expect(service.indexDocument('no-existe')).rejects.toThrow(NotFoundException);
  });

  it('tokeniza cada chunk y los guarda en el índice léxico', async () => {
    const chunks = [
      makeChunk({ id: 'c0', text: 'Hola EC2' }),
      makeChunk({ id: 'c1', text: 'otro texto' }),
    ];
    chunkRepository.findByDocumentId.mockResolvedValue(chunks);

    const result = await service.indexDocument('doc-1');

    expect(result).toEqual({ documentId: 'doc-1', indexedCount: 2 });
    expect(lexicalIndex.add).toHaveBeenCalledWith([
      { chunkId: 'c0', documentId: 'doc-1', tokens: ['hola', 'ec2'] },
      { chunkId: 'c1', documentId: 'doc-1', tokens: ['otro', 'texto'] },
    ]);
  });

  it('borra las entradas anteriores antes de reindexar (idempotencia)', async () => {
    chunkRepository.findByDocumentId.mockResolvedValue([makeChunk({ id: 'c0' })]);

    await service.indexDocument('doc-1');

    expect(lexicalIndex.deleteByDocumentId).toHaveBeenCalledWith('doc-1');

    const deleteOrder = lexicalIndex.deleteByDocumentId.mock.invocationCallOrder[0];
    const addOrder = lexicalIndex.add.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(addOrder);
  });
});