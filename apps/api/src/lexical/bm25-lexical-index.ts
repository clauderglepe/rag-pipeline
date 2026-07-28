import { Injectable } from '@nestjs/common';
import { LexicalEntry, LexicalIndex, LexicalSearchResult } from './lexical-index.interface';
import { computeCorpusStats, bm25Score } from './bm25';

interface StoredEntry {
  chunkId: string;
  documentId: string;
  tokens: string[];
}

@Injectable()
export class Bm25LexicalIndex implements LexicalIndex {
  private readonly entries: StoredEntry[] = [];

  async add(entries: LexicalEntry[]): Promise<void> {
    this.entries.push(...entries);
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    const remaining = this.entries.filter((e) => e.documentId !== documentId);
    this.entries.length = 0;
    this.entries.push(...remaining);
  }

  async search(
    queryTokens: string[],
    topK: number,
    documentId: string,
  ): Promise<LexicalSearchResult[]> {
    const candidates = this.entries.filter((e) => e.documentId === documentId);
    if (candidates.length === 0) return [];

    // Las estadísticas del corpus (N, avgdl, document frequencies) se calculan
    // sobre ESTE conjunto de chunks — no sobre todo lo que haya en `this.entries`
    // de otros documentos. Es justo lo que design.md §2 justifica como necesario,
    // no opcional.
    const corpus = candidates.map((e) => e.tokens);
    const stats = computeCorpusStats(corpus);

    const scored: LexicalSearchResult[] = candidates.map((entry) => ({
      chunkId: entry.chunkId,
      score: bm25Score(queryTokens, entry.tokens, stats),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }
}