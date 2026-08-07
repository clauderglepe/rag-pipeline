import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryRequestDto {
  @ApiProperty({
    description:
      'Pregunta sobre el documento. Se pasa tal cual al LLM: no se recorta ni se ' +
      'modifica de ninguna forma (ver design.md de la Fase 5, §5, y prompt-builder.spec.ts).',
    example: '¿Qué es EC2?',
  })
  @IsString()
  // @Matches (no @IsNotEmpty): rechaza strings de solo espacios sin alterar el
  // valor. NO agregar un @Transform que recorte espacios acá — rompería la
  // garantía ya testeada de que la pregunta llega intacta hasta buildPrompt().
  @Matches(/\S/, { message: 'query no puede estar vacío ni contener solo espacios' })
  query!: string;
}