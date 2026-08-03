import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { QueryService } from './query.service';
import { QueryResponseDto } from './dto/query-response.dto';
import { parseQueryRequest } from './dto/query-request.dto';

@Controller('documents')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post(':documentId/query')
  @HttpCode(HttpStatus.OK)
  async query(
    @Param('documentId') documentId: string,
    @Body() body: unknown,
  ): Promise<QueryResponseDto> {
    const { query } = parseQueryRequest(body);
    return this.queryService.ask(documentId, query);
  }
}