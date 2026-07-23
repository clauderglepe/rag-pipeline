// src/index/in-memory-vector-index.ts
import { Injectable } from '@nestjs/common';
import {
  VectorIndex,
  VectorEntry,
  VectorSearchResult,
} from './vector-index.interface';

// Implementación real: tarea "feat(index): add in-memory vector index"
@Injectable()
export class InMemoryVectorIndex implements VectorIndex {
  async add(_entries: VectorEntry[]): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async search(
    _vector: number[],
    _documentId: string,
    _topK: number,
  ): Promise<VectorSearchResult[]> {
    throw new Error('Not implemented yet');
  }
}
