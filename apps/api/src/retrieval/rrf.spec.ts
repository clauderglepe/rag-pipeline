import { reciprocalRankFusion, RRF_K } from './rrf';

describe('reciprocalRankFusion', () => {
  it('preserva el orden al fusionar una sola lista', () => {
    const list = [{ chunkId: 'a' }, { chunkId: 'b' }, { chunkId: 'c' }];

    const result = reciprocalRankFusion([list]);

    expect(result.map((r) => r.chunkId)).toEqual(['a', 'b', 'c']);
    expect(result[0].score).toBeCloseTo(1 / (RRF_K + 1)); // rank 1
    expect(result[1].score).toBeCloseTo(1 / (RRF_K + 2)); // rank 2
    expect(result[2].score).toBeCloseTo(1 / (RRF_K + 3)); // rank 3
  });

  it('suma las contribuciones cuando un chunk aparece en varias listas', () => {
    // "x" en rank 1 de la lista A y rank 2 de la B; "y" al revés — deberían empatar.
    const listA = [{ chunkId: 'x' }, { chunkId: 'y' }];
    const listB = [{ chunkId: 'y' }, { chunkId: 'x' }];

    const result = reciprocalRankFusion([listA, listB]);

    const scoreX = result.find((r) => r.chunkId === 'x')!.score;
    const scoreY = result.find((r) => r.chunkId === 'y')!.score;

    expect(scoreX).toBeCloseTo(scoreY);
    expect(scoreX).toBeCloseTo(1 / (RRF_K + 1) + 1 / (RRF_K + 2));
  });

  it('un chunk en ambas listas puede superar a uno que solo está en una (caso de spec.md)', () => {
    // "solo" es #1 en semántica, ausente de léxica.
    // "multi" es #3 en semántica y #5 en léxica.
    const semantic = [{ chunkId: 'solo' }, { chunkId: 'x1' }, { chunkId: 'multi' }];
    const lexical = [
      { chunkId: 'y1' },
      { chunkId: 'y2' },
      { chunkId: 'y3' },
      { chunkId: 'y4' },
      { chunkId: 'multi' },
    ];

    const result = reciprocalRankFusion([semantic, lexical]);

    const scoreSolo = result.find((r) => r.chunkId === 'solo')!.score;
    const scoreMulti = result.find((r) => r.chunkId === 'multi')!.score;

    // 1/61 + 1/65 ≈ 0.03126, vs 1/61 ≈ 0.01639 — "multi" gana por aparecer en ambas.
    expect(scoreMulti).toBeGreaterThan(scoreSolo);
  });

  it('ordena el resultado final por score descendente', () => {
    const semantic = [{ chunkId: 'a' }, { chunkId: 'b' }];
    const lexical = [{ chunkId: 'b' }, { chunkId: 'a' }, { chunkId: 'c' }];

    const result = reciprocalRankFusion([semantic, lexical]);

    for (let i = 0; i < result.length - 1; i += 1) {
      expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
    }
  });

  it('acepta un valor de k distinto del default', () => {
    const list = [{ chunkId: 'a' }];

    const result = reciprocalRankFusion([list], 10);

    expect(result[0].score).toBeCloseTo(1 / (10 + 1));
  });

  it('devuelve un array vacío si no hay listas o están vacías', () => {
    expect(reciprocalRankFusion([])).toEqual([]);
    expect(reciprocalRankFusion([[], []])).toEqual([]);
  });

  it('RRF_K es 60 por defecto (valor estándar documentado)', () => {
    expect(RRF_K).toBe(60);
  });
});