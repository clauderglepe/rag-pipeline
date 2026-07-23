import { Injectable } from '@nestjs/common';
import { Chunk, ChunkRepository } from './chunk-repository.interface';

@Injectable()
export class InMemoryChunkRepository implements ChunkRepository {
  private readonly chunksByDocument = new Map<string, Chunk[]>();

  async save(chunks: Chunk[]): Promise<void> {
    if (chunks.length === 0) return;

    // Todos los chunks de una misma llamada a save() pertenecen al mismo documentId
    // (así los produce IngestionService); si no fuera así, es un error de quien llama.
    const documentId = chunks[0].documentId;
    const allSameDocument = chunks.every((c) => c.documentId === documentId);
    if (!allSameDocument) {
      throw new Error(
        'save() solo acepta chunks de un único documentId por llamada',
      );
    }

    this.chunksByDocument.set(documentId, [...chunks]);
  }

  async findByDocumentId(documentId: string): Promise<Chunk[]> {
    const chunks = this.chunksByDocument.get(documentId);
    return chunks ? [...chunks] : [];
  }
}
