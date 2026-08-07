import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RetrievalService } from './retrieval.service';
import { HybridSearchResultDto } from './dto/hybrid-search-result.dto';
import { HybridSearchQueryDto } from './dto/hybrid-search-query.dto';

@Controller('documents')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @Post(':documentId/search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Param('documentId') documentId: string,
    @Body() dto: HybridSearchQueryDto,
  ): Promise<HybridSearchResultDto[]> {
    return this.retrievalService.search(documentId, dto.query, dto.topK);
  }
}