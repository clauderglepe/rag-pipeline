// src/ingestion/chunk-repository.interface.ts
export interface Chunk {
  id: string;
  documentId: string;
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  approxPage: number;
}

export interface ChunkRepository {
  save(chunks: Chunk[]): Promise<void>;
  findByDocumentId(documentId: string): Promise<Chunk[]>;
}

// Token de inyección: como es una interfaz (no existe en runtime), Nest necesita
// un identificador explícito para poder inyectar la implementación concreta.
export const CHUNK_REPOSITORY = Symbol('CHUNK_REPOSITORY');