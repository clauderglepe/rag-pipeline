import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { LexicalIndexingService } from './lexical-indexing.service';
import { LexicalIndexResponseDto } from './dto/lexical-index-response.dto';
import { parseLexicalSearchQuery } from './dto/lexical-search-query.dto';
import { LexicalSearchResultDto } from './dto/lexical-search-result.dto';

@Controller('documents')
export class LexicalController {
  constructor(private readonly lexicalIndexingService: LexicalIndexingService) { }

  @Post(':documentId/index/lexical')
  @HttpCode(HttpStatus.CREATED)
  async index(@Param('documentId') documentId: string): Promise<LexicalIndexResponseDto> {
    return this.lexicalIndexingService.indexDocument(documentId);
  }

  @Post(':documentId/debug/lexical-search')
  @HttpCode(HttpStatus.OK)
  async debugLexicalSearch(
    @Param('documentId') documentId: string,
    @Body() body: unknown,
  ): Promise<LexicalSearchResultDto[]> {
    const { query, topK } = parseLexicalSearchQuery(body);
    return this.lexicalIndexingService.lexicalSearch(documentId, query, topK);
  }
}