import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { IndexingService } from './indexing.service';
import { IndexResponseDto } from './dto/index-response.dto';
import { SemanticSearchResultDto } from './dto/semantic-search-result.dto';
import { parseSemanticSearchQuery } from './dto/semantic-search-query.dto';

@Controller('documents')
export class IndexController {
  constructor(private readonly indexingService: IndexingService) {}

  @Post(':documentId/index')
  @HttpCode(HttpStatus.CREATED)
  async index(@Param('documentId') documentId: string): Promise<IndexResponseDto> {
    return this.indexingService.indexDocument(documentId);
  }

  @Post(':documentId/debug/semantic-search')
  @HttpCode(HttpStatus.OK)
  async debugSemanticSearch(
    @Param('documentId') documentId: string,
    @Body() body: unknown,
  ): Promise<SemanticSearchResultDto[]> {
    const { query, topK } = parseSemanticSearchQuery(body);
    return this.indexingService.semanticSearch(documentId, query, topK);
  }
}