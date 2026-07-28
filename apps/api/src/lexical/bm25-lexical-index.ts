import { Injectable } from '@nestjs/common';
import { LexicalEntry, LexicalIndex, LexicalSearchResult } from './lexical-index.interface';

// Implementación real: tarea "feat(lexical): add bm25 lexical index"
@Injectable()
export class Bm25LexicalIndex implements LexicalIndex {
  async add(_entries: LexicalEntry[]): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async deleteByDocumentId(_documentId: string): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async search(
    _queryTokens: string[],
    _topK: number,
    _documentId: string,
  ): Promise<LexicalSearchResult[]> {
    throw new Error('Not implemented yet');
  }
}