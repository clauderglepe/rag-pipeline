import { computeCorpusStats, bm25Score, BM25_K1, BM25_B } from './bm25';

// Corpus de prueba, tokenizado a mano (3 chunks):
const corpus = [
  ['the', 'cat', 'sat'], // doc0, longitud 3
  ['the', 'dog', 'sat', 'on', 'the', 'mat'], // doc1, longitud 6
  ['cats', 'and', 'dogs'], // doc2, longitud 3
];

describe('computeCorpusStats', () => {
  it('calcula N y avgdl correctamente', () => {
    const stats = computeCorpusStats(corpus);

    expect(stats.totalDocuments).toBe(3);
    expect(stats.averageDocumentLength).toBeCloseTo((3 + 6 + 3) / 3); // 4
  });

  it('cuenta document frequency (chunks distintos), no frecuencia total', () => {
    const stats = computeCorpusStats(corpus);

    // "the" aparece 3 veces en doc1, pero solo en 2 chunks distintos (doc0 y doc1)
    expect(stats.documentFrequencies.get('the')).toBe(2);
    expect(stats.documentFrequencies.get('sat')).toBe(2); // doc0 y doc1
    expect(stats.documentFrequencies.get('cat')).toBe(1); // solo doc0
    expect(stats.documentFrequencies.get('inexistente')).toBeUndefined();
  });
  it('devuelve stats vacías para un corpus vacío, sin dividir por cero', () => {
    const stats = computeCorpusStats([]);

    expect(stats.totalDocuments).toBe(0);
    expect(stats.averageDocumentLength).toBe(0);
  });

});

describe('bm25Score', () => {
  const stats = computeCorpusStats(corpus);

  it('calcula el score exacto para un caso simple (verificado a mano)', () => {
    // Query: ["sat"] contra doc0 (["the", "cat", "sat"], longitud 3)
    // df("sat") = 2, N = 3, avgdl = 4, tf("sat", doc0) = 1
    // idf = ln((3-2+0.5)/(2+0.5) + 1) = ln(1.6) ≈ 0.470004
    // denominador = 1 + 1.5*(1-0.75 + 0.75*3/4) = 1 + 1.5*0.8125 = 2.21875
    // numerador = 1*(1.5+1) = 2.5
    // score = 0.470004 * (2.5/2.21875) ≈ 0.5296
    const score = bm25Score(['sat'], corpus[0], stats);

    expect(score).toBeCloseTo(0.5296, 3);
  });

  it('un término ausente del corpus entero no aporta nada (no lanza error)', () => {
    const score = bm25Score(['palabra-que-no-existe'], corpus[0], stats);
    expect(score).toBe(0);
  });

  it('un término presente en el corpus pero no en este chunk no aporta nada', () => {
    // "mat" solo está en doc1, no en doc0
    const score = bm25Score(['mat'], corpus[0], stats);
    expect(score).toBe(0);
  });

  it('más ocurrencias del término suben el score, pero con retornos decrecientes', () => {
    const onceStats = computeCorpusStats([['x', 'a', 'b'], ['y']]);
    const twiceStats = computeCorpusStats([['x', 'x', 'a', 'b'], ['y']]);

    const scoreOnce = bm25Score(['x'], ['x', 'a', 'b'], onceStats);
    const scoreTwice = bm25Score(['x'], ['x', 'x', 'a', 'b'], twiceStats);

    // Sube...
    expect(scoreTwice).toBeGreaterThan(scoreOnce);
    // ...pero no se duplica exactamente (esa es la propiedad de "saturación" de BM25
    // frente a un conteo lineal ingenuo de frecuencia).
    expect(scoreTwice).toBeLessThan(scoreOnce * 2);
  });

  it('un chunk más largo que el promedio, con la misma frecuencia, puntúa menos (normalización por longitud)', () => {
    const shortDoc = ['x', 'a'];
    const longDoc = ['x', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    const mixedStats = computeCorpusStats([shortDoc, longDoc]);

    const scoreShort = bm25Score(['x'], shortDoc, mixedStats);
    const scoreLong = bm25Score(['x'], longDoc, mixedStats);

    expect(scoreShort).toBeGreaterThan(scoreLong);
  });

  it('suma el score de cada término de la query de forma independiente', () => {
    const scoreOneTerm = bm25Score(['sat'], corpus[0], stats);
    const scoreTwoTerms = bm25Score(['sat', 'cat'], corpus[0], stats);

    expect(scoreTwoTerms).toBeGreaterThan(scoreOneTerm);
  });

  it('usa BM25_K1 y BM25_B como defaults documentados', () => {
    expect(BM25_K1).toBe(1.5);
    expect(BM25_B).toBe(0.75);
  });

});