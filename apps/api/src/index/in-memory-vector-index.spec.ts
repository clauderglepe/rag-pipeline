// src/index/in-memory-vector-index.spec.ts
import { InMemoryVectorIndex } from './in-memory-vector-index';

describe('InMemoryVectorIndex', () => {
  let index: InMemoryVectorIndex;

  beforeEach(() => {
    index = new InMemoryVectorIndex();
  });

  it('devuelve los resultados ordenados por score descendente', async () => {
    await index.add([
      { chunkId: 'a', documentId: 'doc-1', vector: [1, 0] },
      { chunkId: 'b', documentId: 'doc-1', vector: [0, 1] },
      { chunkId: 'c', documentId: 'doc-1', vector: [0.9, 0.1] },
    ]);

    const results = await index.search([1, 0], 3);

    expect(results.map((r) => r.chunkId)).toEqual(['a', 'c', 'b']);
  });

  it('respeta el límite topK', async () => {
    await index.add([
      { chunkId: 'a', documentId: 'doc-1', vector: [1, 0] },
      { chunkId: 'b', documentId: 'doc-1', vector: [0.9, 0.1] },
      { chunkId: 'c', documentId: 'doc-1', vector: [0.1, 0.9] },
    ]);

    const results = await index.search([1, 0], 2);

    expect(results).toHaveLength(2);
  });

  it('filtra por documentId cuando se especifica', async () => {
    await index.add([
      { chunkId: 'a', documentId: 'doc-1', vector: [1, 0] },
      { chunkId: 'b', documentId: 'doc-2', vector: [1, 0] },
    ]);

    const results = await index.search([1, 0], 10, 'doc-1');

    expect(results.map((r) => r.chunkId)).toEqual(['a']);
  });

  it('devuelve un array vacío si no hay entradas', async () => {
    const results = await index.search([1, 0], 5);
    expect(results).toEqual([]);
  });

  it('calcula scores correctos con vectores de entrada SIN normalizar', async () => {
    // Vectores deliberadamente no unitarios (normas muy distintas entre sí) —
    // este es el caso que justifica normalizar dentro del índice y no confiar
    // en que el proveedor de embeddings ya lo haga (ver design.md §2).
    await index.add([
      { chunkId: 'a', documentId: 'doc-1', vector: [100, 0] }, // norma 100
      { chunkId: 'b', documentId: 'doc-1', vector: [0, 0.001] }, // norma 0.001
    ]);

    const results = await index.search([50, 0], 2); // también sin normalizar

    // Si no se normalizara internamente, 'a' ganaría de forma aplastante por la
    // magnitud del vector, no por dirección/similitud real.
    expect(results[0].chunkId).toBe('a');
    expect(results[0].score).toBeCloseTo(1); // misma dirección exacta → coseno = 1
    expect(results[1].score).toBeCloseTo(0); // direcciones perpendiculares → coseno = 0
  });
});