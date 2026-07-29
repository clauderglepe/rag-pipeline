import { NotFoundException } from '@nestjs/common';
import { RetrievalService } from './retrieval.service';
import { IndexingService } from '../index/indexing.service';
import { LexicalIndexingService } from '../lexical/lexical-indexing.service';

describe('RetrievalService', () => {
  let service: RetrievalService;
  let indexingService: jest.Mocked<IndexingService>;
  let lexicalIndexingService: jest.Mocked<LexicalIndexingService>;

  beforeEach(() => {
    indexingService = { semanticSearch: jest.fn() } as any;
    lexicalIndexingService = { lexicalSearch: jest.fn() } as any;

    service = new RetrievalService(indexingService, lexicalIndexingService);
  });

  it('llama a ambas búsquedas con el pool de candidatos, no con el topK final', async () => {
    indexingService.semanticSearch.mockResolvedValue([]);
    lexicalIndexingService.lexicalSearch.mockResolvedValue([]);

    await service.search('doc-1', 'query', 5);

    expect(indexingService.semanticSearch).toHaveBeenCalledWith('doc-1', 'query', 20);
    expect(lexicalIndexingService.lexicalSearch).toHaveBeenCalledWith('doc-1', 'query', 20);
  });

  it('fusiona resultados y marca foundIn correctamente', async () => {
    indexingService.semanticSearch.mockResolvedValue([
      { chunkId: 'a', score: 0.9, page: 1, text: 'texto a' },
      { chunkId: 'b', score: 0.5, page: 2, text: 'texto b' },
    ]);
    lexicalIndexingService.lexicalSearch.mockResolvedValue([
      { chunkId: 'b', score: 3.2, page: 2, text: 'texto b' },
      { chunkId: 'c', score: 1.1, page: 3, text: 'texto c' },
    ]);

    const result = await service.search('doc-1', 'query', 5);
    const byId = new Map(result.map((r) => [r.chunkId, r]));

    expect(byId.get('a')!.foundIn).toEqual(['semantic']);
    expect(byId.get('b')!.foundIn).toEqual(['semantic', 'lexical']);
    expect(byId.get('c')!.foundIn).toEqual(['lexical']);

    // "b" está en ambas listas -> debería superar a los que están en una sola.
    expect(byId.get('b')!.score).toBeGreaterThan(byId.get('a')!.score);
    expect(byId.get('b')!.score).toBeGreaterThan(byId.get('c')!.score);
  });

  it('respeta el topK final tras la fusión', async () => {
    indexingService.semanticSearch.mockResolvedValue([
      { chunkId: 'a', score: 0.9, page: 1, text: 'x' },
      { chunkId: 'b', score: 0.8, page: 1, text: 'x' },
      { chunkId: 'c', score: 0.7, page: 1, text: 'x' },
    ]);
    lexicalIndexingService.lexicalSearch.mockResolvedValue([]);

    const result = await service.search('doc-1', 'query', 2);

    expect(result).toHaveLength(2);
  });

  it('propaga NotFoundException si el documento no existe', async () => {
    indexingService.semanticSearch.mockRejectedValue(new NotFoundException('no existe'));
    lexicalIndexingService.lexicalSearch.mockResolvedValue([]);

    await expect(service.search('no-existe', 'query', 5)).rejects.toThrow(NotFoundException);
  });

  it('conserva page y text del chunk resuelto', async () => {
    indexingService.semanticSearch.mockResolvedValue([
      { chunkId: 'a', score: 0.9, page: 7, text: 'contenido real' },
    ]);
    lexicalIndexingService.lexicalSearch.mockResolvedValue([]);

    const result = await service.search('doc-1', 'query', 5);

    expect(result[0].page).toBe(7);
    expect(result[0].text).toBe('contenido real');
  });
});