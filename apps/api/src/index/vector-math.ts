// src/index/vector-math.ts
export function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector; // vector nulo: evitar división por cero, ver design.md §2
  return vector.map((v) => v / norm);
}

export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vectores de dimensiones distintas: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
}