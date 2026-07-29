import { Injectable } from '@nestjs/common';
import { IndexingService } from '../index/indexing.service';
import { LexicalIndexingService } from '../lexical/lexical-indexing.service';
import { reciprocalRankFusion, RankedEntry } from './rrf';
import { HybridSearchResultDto } from './dto/hybrid-search-result.dto';

// Pool de candidatos por índice antes de fusionar — no es el topK final que pide
// el cliente. Ver design.md §2 para la justificación.
const RRF_CANDIDATE_POOL_SIZE = 20;

@Injectable()
export class RetrievalService {
  constructor(
    private readonly indexingService: IndexingService,
    private readonly lexicalIndexingService: LexicalIndexingService,
  ) {}

  async search(
    documentId: string,
    query: string,
    topK: number,
  ): Promise<HybridSearchResultDto[]> {
    const [semanticResults, lexicalResults] = await Promise.all([
      this.indexingService.semanticSearch(documentId, query, RRF_CANDIDATE_POOL_SIZE),
      this.lexicalIndexingService.lexicalSearch(documentId, query, RRF_CANDIDATE_POOL_SIZE),
    ]);

    const semanticEntries: RankedEntry[] = semanticResults.map((r) => ({ chunkId: r.chunkId }));
    const lexicalEntries: RankedEntry[] = lexicalResults.map((r) => ({ chunkId: r.chunkId }));

    const fused = reciprocalRankFusion([semanticEntries, lexicalEntries]);

    const metadataById = new Map<string, { page: number; text: string }>();
    for (const r of [...semanticResults, ...lexicalResults]) {
      metadataById.set(r.chunkId, { page: r.page, text: r.text });
    }

    const foundInSemantic = new Set(semanticResults.map((r) => r.chunkId));
    const foundInLexical = new Set(lexicalResults.map((r) => r.chunkId));

    return fused.slice(0, topK).map((f) => {
      const metadata = metadataById.get(f.chunkId);
      if (!metadata) {
        // No debería pasar nunca: reciprocalRankFusion solo produce chunkIds que
        // vinieron de alguna de las dos listas de origen. Si esto se dispara, es un
        // bug de cómo se construyó metadataById, no un caso de negocio esperado.
        throw new Error(`Chunk "${f.chunkId}" no tiene metadata resuelta tras la fusión`);
      }

      const foundIn: Array<'semantic' | 'lexical'> = [];
      if (foundInSemantic.has(f.chunkId)) foundIn.push('semantic');
      if (foundInLexical.has(f.chunkId)) foundIn.push('lexical');

      return {
        chunkId: f.chunkId,
        score: f.score,
        page: metadata.page,
        text: metadata.text,
        foundIn,
      };
    });
  }
}