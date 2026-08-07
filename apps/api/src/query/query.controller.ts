import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { QueryService } from './query.service';
import { QueryResponseDto } from './dto/query-response.dto';
import { QueryRequestDto } from './dto/query-request.dto';

@Controller('documents')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post(':documentId/query')
  @HttpCode(HttpStatus.OK)
  async query(
    @Param('documentId') documentId: string,
    @Body() dto: QueryRequestDto,
  ): Promise<QueryResponseDto> {
    return this.queryService.ask(documentId, dto.query);
  }
}