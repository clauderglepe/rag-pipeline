import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CHUNK_REPOSITORY, Chunk, type ChunkRepository } from '../ingestion/chunk-repository.interface';
import { EMBEDDING_PROVIDER,type EmbeddingProvider } from './embedding-provider.interface';
import { VECTOR_INDEX, VectorEntry,type VectorIndex } from './vector-index.interface';
import { EnvironmentVariables } from '../config/env.validation';
import { IndexResponseDto } from './dto/index-response.dto';

@Injectable()
export class IndexingService {
  constructor(
    @Inject(CHUNK_REPOSITORY) private readonly chunkRepository: ChunkRepository,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddingProvider: EmbeddingProvider,
    @Inject(VECTOR_INDEX) private readonly vectorIndex: VectorIndex,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async indexDocument(documentId: string): Promise<IndexResponseDto> {
    const chunks = await this.chunkRepository.findByDocumentId(documentId);

    if (chunks.length === 0) {
      throw new NotFoundException(
        `No se encontró el documento "${documentId}". ¿Fue ingerido con POST /documents?`,
      );
    }

    const batchSize = this.configService.get('EMBEDDING_BATCH_SIZE', { infer: true });
    let embeddedCount = 0;

    // Secuencial, no en paralelo (Promise.all sobre los lotes): Ollama procesa
    // inferencia sobre una única instancia de modelo — lanzar lotes en paralelo no
    // acelera nada real (solo se encolarían del otro lado) y complica saber cuál lote
    // falló si algo sale mal.
    for (const batch of this.splitIntoBatches(chunks, batchSize)) {
      const vectors = await this.embeddingProvider.embed(batch.map((c) => c.text));

      const entries: VectorEntry[] = batch.map((chunk, i) => ({
        chunkId: chunk.id,
        documentId: chunk.documentId,
        vector: vectors[i],
      }));

      await this.vectorIndex.add(entries);
      embeddedCount += entries.length;
    }

    return { documentId, embeddedCount };
  }

  private splitIntoBatches(chunks: Chunk[], batchSize: number): Chunk[][] {
    const batches: Chunk[][] = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
      batches.push(chunks.slice(i, i + batchSize));
    }
    return batches;
  }
}