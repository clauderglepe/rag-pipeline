import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { IndexingService } from './indexing.service';
import { IndexResponseDto } from './dto/index-response.dto';

@Controller('documents')
export class IndexController {
  constructor(private readonly indexingService: IndexingService) {}

  @Post(':documentId/index/semantic')
  @HttpCode(HttpStatus.CREATED)
  async index(@Param('documentId') documentId: string): Promise<IndexResponseDto> {
    return this.indexingService.indexDocument(documentId);
  }
}