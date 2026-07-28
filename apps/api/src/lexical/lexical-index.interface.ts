export interface LexicalEntry {
  chunkId: string;
  documentId: string;
  tokens: string[];
}

export interface LexicalSearchResult {
  chunkId: string;
  score: number;
}

export interface LexicalIndex {
  add(entries: LexicalEntry[]): Promise<void>;
  deleteByDocumentId(documentId: string): Promise<void>;
  // documentId obligatorio, no opcional — ver design.md §2
  search(queryTokens: string[], topK: number, documentId: string): Promise<LexicalSearchResult[]>;
}

export const LEXICAL_INDEX = Symbol('LEXICAL_INDEX');