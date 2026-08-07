import { ApiProperty } from '@nestjs/swagger';

export class IndexResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty({ description: 'Cantidad de chunks a los que se generó embedding' })
  embeddedCount!: number;
}