// src/index/vector-index.interface.ts
export interface VectorEntry {
  chunkId: string;
  documentId: string;
  vector: number[];
}

export interface VectorSearchResult {
  chunkId: string;
  score: number;
}

export interface VectorIndex {
  add(entries: VectorEntry[]): Promise<void>;
  search(
    vector: number[],
    documentId: string,
    topK: number,
  ): Promise<VectorSearchResult[]>;
}

export const VECTOR_INDEX = Symbol('VECTOR_INDEX');
