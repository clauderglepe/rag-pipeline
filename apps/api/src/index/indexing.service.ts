import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CHUNK_REPOSITORY, Chunk, type ChunkRepository } from '../ingestion/chunk-repository.interface';
import { EMBEDDING_PROVIDER, type EmbeddingProvider } from './embedding-provider.interface';
import { VECTOR_INDEX, VectorEntry, type VectorIndex } from './vector-index.interface';
import { EnvironmentVariables } from '../config/env.validation';
import { IndexResponseDto } from './dto/index-response.dto';
import { SemanticSearchResultDto } from './dto/semantic-search-result.dto';

@Injectable()
export class IndexingService {
  constructor(
    @Inject(CHUNK_REPOSITORY) private readonly chunkRepository: ChunkRepository,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddingProvider: EmbeddingProvider,
    @Inject(VECTOR_INDEX) private readonly vectorIndex: VectorIndex,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) { }

  async indexDocument(documentId: string): Promise<IndexResponseDto> {
    const chunks = await this.chunkRepository.findByDocumentId(documentId);

    if (chunks.length === 0) {
      throw new NotFoundException(
        `No se encontró el documento "${documentId}". ¿Fue ingerido con POST /documents?`,
      );
    }
    // Idempotencia: reindexar el mismo documento reemplaza sus entradas
    // anteriores en vez de acumularlas — ver ADR/design.md.
    await this.vectorIndex.deleteByDocumentId(documentId);

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

  async semanticSearch(
    documentId: string,
    query: string,
    topK: number,
  ): Promise<SemanticSearchResultDto[]> {
    const chunks = await this.chunkRepository.findByDocumentId(documentId);

    if (chunks.length === 0) {
      throw new NotFoundException(
        `No se encontró el documento "${documentId}". ¿Fue ingerido con POST /documents?`,
      );
    }

    const chunksById = new Map(chunks.map((c) => [c.id, c]));

    const [queryVector] = await this.embeddingProvider.embed([query]);
    const results = await this.vectorIndex.search(queryVector, topK, documentId);

    return results.map((r) => {
      const chunk = chunksById.get(r.chunkId);
      if (!chunk) {
        // No debería pasar nunca en operación normal: el vector index solo puede
        // tener chunkIds que vinieron de ChunkRepository en algún momento (tarea 6).
        // Si pasa, es una corrupción de datos entre los dos repositorios, no un
        // caso de negocio esperado — fallamos ruidosamente en vez de devolver basura.
        throw new Error(`Chunk "${r.chunkId}" está en el índice vectorial pero no en ChunkRepository`);
      }
      return { chunkId: chunk.id, score: r.score, page: chunk.page, text: chunk.text };
    });
  }
}