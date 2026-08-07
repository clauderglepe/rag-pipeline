import { ApiProperty } from '@nestjs/swagger';

export class LexicalIndexResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty({ description: 'Cantidad de chunks indexados en BM25' })
  indexedCount!: number;
}