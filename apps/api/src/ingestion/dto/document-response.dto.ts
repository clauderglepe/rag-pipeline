import { ApiProperty } from '@nestjs/swagger';

export class DocumentResponseDto {
  @ApiProperty({ description: 'Identificador único del documento ingerido' })
  documentId!: string;

  @ApiProperty({ description: 'Cantidad de chunks generados a partir del PDF' })
  chunkCount!: number;
}