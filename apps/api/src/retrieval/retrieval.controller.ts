import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RetrievalService } from './retrieval.service';
import { HybridSearchResultDto } from './dto/hybrid-search-result.dto';
import { parseHybridSearchQuery } from './dto/hybrid-search-query.dto';

@Controller('documents')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) { }

  @Post(':documentId/search')
  @HttpCode(HttpStatus.OK)
  async retrievalSearch(
    @Param('documentId') documentId: string,
    @Body() body: unknown,
  ): Promise<HybridSearchResultDto[]> {
    const { query, topK } = parseHybridSearchQuery(body);
    return this.retrievalService.search(documentId, query, topK);
  }
}
