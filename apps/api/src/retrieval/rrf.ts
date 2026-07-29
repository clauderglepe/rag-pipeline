// Valor estándar de la literatura (Weaviate, Elastic) — ver design.md §1.
export const RRF_K = 60;

export interface RankedEntry {
  chunkId: string;
}

export interface FusedResult {
  chunkId: string;
  score: number;
}

export function reciprocalRankFusion(
  rankedLists: RankedEntry[][],
  k: number = RRF_K,
): FusedResult[] {
  const scores = new Map<string, number>();

  for (const list of rankedLists) {
    list.forEach((entry, index) => {
      const rank = index + 1; // 1-indexado: el primer puesto es rank 1, no 0
      const contribution = 1 / (k + rank);
      scores.set(entry.chunkId, (scores.get(entry.chunkId) ?? 0) + contribution);
    });
  }

  return Array.from(scores.entries())
    .map(([chunkId, score]) => ({ chunkId, score }))
    .sort((a, b) => b.score - a.score);
}