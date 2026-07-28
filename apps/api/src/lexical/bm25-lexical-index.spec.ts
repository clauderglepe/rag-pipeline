import { Bm25LexicalIndex } from './bm25-lexical-index';

describe('Bm25LexicalIndex', () => {
  let index: Bm25LexicalIndex;

  beforeEach(() => {
    index = new Bm25LexicalIndex();
  });

  it('devuelve los resultados ordenados por score descendente', async () => {
    await index.add([
      { chunkId: 'a', documentId: 'doc-1', tokens: ['gato', 'perro', 'raton'] },
      { chunkId: 'b', documentId: 'doc-1', tokens: ['gato', 'gato', 'gato'] }, // más repeticiones de "gato"
      { chunkId: 'c', documentId: 'doc-1', tokens: ['perro', 'raton'] }, // no contiene "gato"
    ]);

    const results = await index.search(['gato'], 3, 'doc-1');

    expect(results.map((r) => r.chunkId)).toEqual(['b', 'a', 'c']);
    expect(results[2].score).toBe(0); // "c" no contiene el término, score 0
  });

  it('respeta el límite topK', async () => {
    await index.add([
      { chunkId: 'a', documentId: 'doc-1', tokens: ['x'] },
      { chunkId: 'b', documentId: 'doc-1', tokens: ['x', 'x'] },
      { chunkId: 'c', documentId: 'doc-1', tokens: ['x', 'x', 'x'] },
    ]);

    const results = await index.search(['x'], 2, 'doc-1');

    expect(results).toHaveLength(2);
  });

  it('exige documentId y aísla las estadísticas entre documentos distintos', async () => {
    await index.add([
      { chunkId: 'a', documentId: 'doc-1', tokens: ['unico', 'termino'] },
      { chunkId: 'b', documentId: 'doc-2', tokens: ['otro', 'contenido'] },
    ]);

    const resultsDoc1 = await index.search(['unico'], 10, 'doc-1');
    const resultsDoc2 = await index.search(['unico'], 10, 'doc-2');

    expect(resultsDoc1.map((r) => r.chunkId)).toEqual(['a']);
    expect(resultsDoc1[0].score).toBeGreaterThan(0);

    // doc-2 sí tiene un candidato ("b"), pero "unico" no está en su corpus —
    // se devuelve igual, con score 0 (no una lista vacía: eso es un caso distinto,
    // cubierto por el test "devuelve un array vacío si el documentId no tiene entradas").
    expect(resultsDoc2.map((r) => r.chunkId)).toEqual(['b']);
    expect(resultsDoc2[0].score).toBe(0);
  });

      it('devuelve un array vacío si el documentId no tiene entradas', async () => {
        const results = await index.search(['algo'], 5, 'doc-inexistente');
        expect(results).toEqual([]);
      });
   
      it('deleteByDocumentId elimina solo las entradas de ese documento', async () => {
        await index.add([
          { chunkId: 'a', documentId: 'doc-1', tokens: ['x'] },
          { chunkId: 'b', documentId: 'doc-2', tokens: ['x'] },
        ]);
    
        await index.deleteByDocumentId('doc-1');
    
        expect(await index.search(['x'], 10, 'doc-1')).toEqual([]);
        expect(await index.search(['x'], 10, 'doc-2')).toHaveLength(1);
      });
      
      it('reindexar el mismo documento no duplica entradas (idempotencia, desde el diseño)', async () => {
        const entries = [{ chunkId: 'a', documentId: 'doc-1', tokens: ['x', 'y'] }];
    
        await index.add(entries);
        await index.deleteByDocumentId('doc-1');
        await index.add(entries);
    
        const results = await index.search(['x'], 10, 'doc-1');
        expect(results).toHaveLength(1); // no 2
      }); 
  });