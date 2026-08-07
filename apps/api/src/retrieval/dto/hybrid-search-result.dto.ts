import { ApiProperty } from '@nestjs/swagger';

export class HybridSearchResultDto {
  @ApiProperty()
  chunkId!: string;

  @ApiProperty({ description: 'Score de Reciprocal Rank Fusion (sin techo fijo, siempre ≥ 0)' })
  score!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  text!: string;

  @ApiProperty({
    description: 'De qué índice(s) proviene este resultado',
    enum: ['semantic', 'lexical'],
    isArray: true,
  })
  foundIn!: Array<'semantic' | 'lexical'>;
}