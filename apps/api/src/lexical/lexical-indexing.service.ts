import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CHUNK_REPOSITORY, type ChunkRepository } from '../ingestion/chunk-repository.interface';
import { LEXICAL_INDEX, LexicalEntry, type LexicalIndex } from './lexical-index.interface';
import { tokenize } from './tokenizer';
import { LexicalIndexResponseDto } from './dto/lexical-index-response.dto';

@Injectable()
export class LexicalIndexingService {
  constructor(
    @Inject(CHUNK_REPOSITORY) private readonly chunkRepository: ChunkRepository,
    @Inject(LEXICAL_INDEX) private readonly lexicalIndex: LexicalIndex,
  ) {}

  async indexDocument(documentId: string): Promise<LexicalIndexResponseDto> {
    const chunks = await this.chunkRepository.findByDocumentId(documentId);

    if (chunks.length === 0) {
      throw new NotFoundException(
        `No se encontró el documento "${documentId}". ¿Fue ingerido con POST /documents?`,
      );
    }

    // Idempotencia: mismo criterio que IndexingService (Fase 2, ver design.md §5) —
    // reindexar reemplaza las entradas anteriores, nunca las acumula.
    await this.lexicalIndex.deleteByDocumentId(documentId);

    const entries: LexicalEntry[] = chunks.map((chunk) => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      tokens: tokenize(chunk.text),
    }));

    await this.lexicalIndex.add(entries);

    return { documentId, indexedCount: entries.length };
  }
}