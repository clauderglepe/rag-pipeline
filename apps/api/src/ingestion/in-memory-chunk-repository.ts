// src/ingestion/in-memory-chunk-repository.ts
import { Injectable } from '@nestjs/common';
import { Chunk, ChunkRepository } from './chunk-repository.interface';

// Implementación real: tarea "feat(ingestion): add in-memory chunk repository"
@Injectable()
export class InMemoryChunkRepository implements ChunkRepository {
  async save(_chunks: Chunk[]): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async findByDocumentId(_documentId: string): Promise<Chunk[]> {
    throw new Error('Not implemented yet');
  }
}