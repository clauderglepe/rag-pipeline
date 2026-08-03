import { Injectable } from '@nestjs/common';
import { RetrievalService } from '../retrieval/retrieval.service';
import { GenerationService } from '../generation/generation.service';
import { QueryResponseDto } from './dto/query-response.dto';

const CONTEXT_TOP_K = 5; // fijo, no configurable — ver design.md §3

const NO_CONTEXT_MESSAGE =
  'No hay contenido indexado para este documento todavía. Indéxalo con ' +
  'POST /documents/:id/index/semantic y/o /index/lexical antes de preguntar.';

@Injectable()
export class QueryService {
  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly generationService: GenerationService,
  ) {}

  async ask(documentId: string, query: string): Promise<QueryResponseDto> {
    const results = await this.retrievalService.search(documentId, query, CONTEXT_TOP_K);

    if (results.length === 0) {
      // Sin contexto: no tiene sentido gastar una llamada de inferencia al LLM
      // para que "diga que no sabe" algo que ya sabemos de antemano — ver design.md §4.
      return { answer: NO_CONTEXT_MESSAGE, sources: [] };
    }

    const answer = await this.generationService.generateAnswer(
      query,
      results.map((r) => ({ page: r.page, text: r.text })),
    );

    return {
      answer,
      sources: results.map((r) => ({ chunkId: r.chunkId, page: r.page, foundIn: r.foundIn })),
    };
  }
}