import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { LexicalIndexingService } from './lexical-indexing.service';
import { LexicalIndexResponseDto } from './dto/lexical-index-response.dto';


@Controller('documents')
export class LexicalController {
  constructor(private readonly lexicalIndexingService: LexicalIndexingService) { }

  @Post(':documentId/index/lexical')
  @HttpCode(HttpStatus.CREATED)
  async index(@Param('documentId') documentId: string): Promise<LexicalIndexResponseDto> {
    return this.lexicalIndexingService.indexDocument(documentId);
  }
}