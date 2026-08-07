import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HybridSearchQueryDto {
  @ApiProperty({ description: 'Texto de la búsqueda', example: '¿qué es EC2?' })
  @IsString()
  @MinLength(1)
  query!: string;

  @ApiPropertyOptional({
    description: 'Cantidad máxima de resultados a devolver',
    default: 5,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  topK: number = 5;
}