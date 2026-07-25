// src/index/in-memory-vector-index.ts
import { Injectable } from '@nestjs/common';
import { VectorEntry, VectorIndex, VectorSearchResult } from './vector-index.interface';
import { normalizeVector, dotProduct } from './vector-math';

interface StoredEntry {
  chunkId: string;
  documentId: string;
  vector: number[]; // ya normalizado
}

@Injectable()
export class InMemoryVectorIndex implements VectorIndex {
  private readonly entries: StoredEntry[] = [];

  async add(entries: VectorEntry[]): Promise<void> {
    for (const entry of entries) {
      this.entries.push({
        chunkId: entry.chunkId,
        documentId: entry.documentId,
        vector: normalizeVector(entry.vector),
      });
    }
  }

  async search(
    queryVector: number[],
    topK: number,
    documentId?: string,
  ): Promise<VectorSearchResult[]> {
    const normalizedQuery = normalizeVector(queryVector);

    const candidates = documentId
      ? this.entries.filter((e) => e.documentId === documentId)
      : this.entries;

    const scored: VectorSearchResult[] = candidates.map((entry) => ({
      chunkId: entry.chunkId,
      score: dotProduct(normalizedQuery, entry.vector),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }
  async deleteByDocumentId(documentId: string): Promise<void> {
    const remaining = this.entries.filter((e) => e.documentId !== documentId);
    this.entries.length = 0;
    this.entries.push(...remaining);
  }
}