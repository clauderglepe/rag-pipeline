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
  deleteByDocumentId(documentId: string): Promise<void>;
  search(queryVector: number[], topK: number, documentId?: string): Promise<VectorSearchResult[]>;
}

export const VECTOR_INDEX = Symbol('VECTOR_INDEX');