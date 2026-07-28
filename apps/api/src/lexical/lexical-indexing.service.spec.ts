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

  describe('lexicalSearch', () => {
    it('lanza NotFoundException si el documento no existe', async () => {
      chunkRepository.findByDocumentId.mockResolvedValue([]);

      await expect(service.lexicalSearch('no-existe', 'algo', 5)).rejects.toThrow(NotFoundException);
    });

    it('devuelve lista vacía si el documento existe pero no fue indexado léxicamente', async () => {
      chunkRepository.findByDocumentId.mockResolvedValue([makeChunk()]);
      lexicalIndex.search.mockResolvedValue([]);

      const result = await service.lexicalSearch('doc-1', 'algo', 5);

      expect(result).toEqual([]);
    });

    it('tokeniza la query antes de buscar', async () => {
      chunkRepository.findByDocumentId.mockResolvedValue([makeChunk()]);
      lexicalIndex.search.mockResolvedValue([]);

      await service.lexicalSearch('doc-1', 'Hola EC2!', 5);

      expect(lexicalIndex.search).toHaveBeenCalledWith(['hola', 'ec2'], 5, 'doc-1');
    });

    it('resuelve texto y página de cada resultado contra ChunkRepository', async () => {
      chunkRepository.findByDocumentId.mockResolvedValue([
        makeChunk({ id: 'c0', text: 'texto A', page: 3 }),
      ]);
      lexicalIndex.search.mockResolvedValue([{ chunkId: 'c0', score: 2.1 }]);

      const result = await service.lexicalSearch('doc-1', 'algo', 5);

      expect(result).toEqual([{ chunkId: 'c0', score: 2.1, page: 3, text: 'texto A' }]);
    });
  });

});
