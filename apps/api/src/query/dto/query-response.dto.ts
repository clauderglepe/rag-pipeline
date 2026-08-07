// src/query/dto/query-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class QuerySourceDto {
  @ApiProperty()
  chunkId!: string;

  @ApiProperty()
  page!: number;

  @ApiProperty({ enum: ['semantic', 'lexical'], isArray: true })
  foundIn!: Array<'semantic' | 'lexical'>;
}

export class QueryResponseDto {
  @ApiProperty({ description: 'Respuesta generada por el LLM en base al contexto recuperado' })
  answer!: string;

  @ApiProperty({ type: QuerySourceDto, isArray: true })
  sources!: QuerySourceDto[];
}