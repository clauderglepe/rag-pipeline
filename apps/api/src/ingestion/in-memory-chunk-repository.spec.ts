import { InMemoryChunkRepository } from './in-memory-chunk-repository';
import { Chunk } from './chunk-repository.interface';

function makeChunk(overrides: Partial<Chunk> = {}): Chunk {
  return {
    id: 'chunk-1',
    documentId: 'doc-1',
    index: 0,
    text: 'hola mundo',
    startOffset: 0,
    endOffset: 10,
    page: 1,
    ...overrides,
  };
}

describe('InMemoryChunkRepository', () => {
  let repository: InMemoryChunkRepository;

  beforeEach(() => {
    repository = new InMemoryChunkRepository();
  });

  it('guarda y recupera chunks por documentId', async () => {
    const chunks = [makeChunk({ id: 'c1', index: 0 }), makeChunk({ id: 'c2', index: 1 })];

    await repository.save(chunks);
    const result = await repository.findByDocumentId('doc-1');

    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('devuelve un array vacío para un documentId desconocido', async () => {
    const result = await repository.findByDocumentId('no-existe');
    expect(result).toEqual([]);
  });

  it('reemplaza los chunks existentes al volver a guardar el mismo documentId', async () => {
    await repository.save([makeChunk({ id: 'c1' })]);
    await repository.save([makeChunk({ id: 'c2' })]);

    const result = await repository.findByDocumentId('doc-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c2');
  });

  it('mantiene documentos distintos aislados entre sí', async () => {
    await repository.save([makeChunk({ documentId: 'doc-1', id: 'c1' })]);
    await repository.save([makeChunk({ documentId: 'doc-2', id: 'c2' })]);

    expect(await repository.findByDocumentId('doc-1')).toHaveLength(1);
    expect(await repository.findByDocumentId('doc-2')).toHaveLength(1);
  });

  it('rechaza mezclar chunks de distintos documentId en un mismo save()', async () => {
    const chunks = [
      makeChunk({ documentId: 'doc-1', id: 'c1' }),
      makeChunk({ documentId: 'doc-2', id: 'c2' }),
    ];

    await expect(repository.save(chunks)).rejects.toThrow();
  });

  it('no permite mutar el estado interno a través del array devuelto', async () => {
    await repository.save([makeChunk({ id: 'c1' })]);

    const result = await repository.findByDocumentId('doc-1');
    result.push(makeChunk({ id: 'intruso' }));

    const secondRead = await repository.findByDocumentId('doc-1');
    expect(secondRead).toHaveLength(1);
  });
});