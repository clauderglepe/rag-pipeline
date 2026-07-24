// src/index/vector-math.spec.ts
import { normalizeVector, dotProduct } from './vector-math';

describe('vector-math', () => {
  describe('normalizeVector', () => {
    it('produce un vector de norma 1', () => {
      const result = normalizeVector([3, 4]); // norma = 5

      expect(result[0]).toBeCloseTo(0.6);
      expect(result[1]).toBeCloseTo(0.8);
    });

    it('no lanza error con un vector nulo (todo ceros)', () => {
      expect(normalizeVector([0, 0, 0])).toEqual([0, 0, 0]);
    });

    it('no altera un vector ya normalizado', () => {
      const alreadyNormalized = normalizeVector([1, 0, 0]);
      expect(normalizeVector(alreadyNormalized)).toEqual(alreadyNormalized);
    });
  });

  describe('dotProduct', () => {
    it('calcula el producto punto correctamente', () => {
      expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(1 * 4 + 2 * 5 + 3 * 6);
    });

    it('da 1 para dos vectores normalizados idénticos', () => {
      const v = normalizeVector([3, 4]);
      expect(dotProduct(v, v)).toBeCloseTo(1);
    });

    it('lanza error si las dimensiones no coinciden', () => {
      expect(() => dotProduct([1, 2], [1, 2, 3])).toThrow();
    });
  });
});