export interface Chunk {
  id: string;
  documentId: string;
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  page: number; // antes: approxPage
}

export interface ChunkRepository {
  save(chunks: Chunk[]): Promise<void>;
  findByDocumentId(documentId: string): Promise<Chunk[]>;
}

export const CHUNK_REPOSITORY = Symbol('CHUNK_REPOSITORY');