import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CHUNK_REPOSITORY, type ChunkRepository } from '../ingestion/chunk-repository.interface';
import { LEXICAL_INDEX, LexicalEntry, type LexicalIndex } from './lexical-index.interface';
import { tokenize } from './tokenizer';
import { LexicalIndexResponseDto } from './dto/lexical-index-response.dto';
import { LexicalSearchResultDto } from './dto/lexical-search-result.dto';

@Injectable()
export class LexicalIndexingService {
  constructor(
    @Inject(CHUNK_REPOSITORY) private readonly chunkRepository: ChunkRepository,
    @Inject(LEXICAL_INDEX) private readonly lexicalIndex: LexicalIndex,
  ) { }

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

  async lexicalSearch(
    documentId: string,
    query: string,
    topK: number,
  ): Promise<LexicalSearchResultDto[]> {
    const chunks = await this.chunkRepository.findByDocumentId(documentId);

    if (chunks.length === 0) {
      throw new NotFoundException(
        `No se encontró el documento "${documentId}". ¿Fue ingerido con POST /documents?`,
      );
    }

    const chunksById = new Map(chunks.map((c) => [c.id, c]));
    const queryTokens = tokenize(query); // misma función que en indexDocument()

    const results = await this.lexicalIndex.search(queryTokens, topK, documentId);

    return results.map((r) => {
      const chunk = chunksById.get(r.chunkId);
      if (!chunk) {
        // Mismo caso defensivo que en IndexingService.semanticSearch (Fase 2) —
        // no debería pasar nunca en operación normal.
        throw new Error(`Chunk "${r.chunkId}" está en el índice léxico pero no en ChunkRepository`);
      }
      return { chunkId: chunk.id, score: r.score, page: chunk.page, text: chunk.text };
    });
  }
}