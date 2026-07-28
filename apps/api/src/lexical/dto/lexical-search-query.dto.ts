import { BadRequestException } from '@nestjs/common';

export interface LexicalSearchQuery {
  query: string;
  topK: number;
}

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 50;

// Validación manual — mismo criterio y misma duplicación deliberada que
// semantic-search-query.dto.ts (Fase 2, tarea 7): ambos endpoints de debug se
// retiran juntos en la Fase 4/5, así que extraer un helper compartido ahora sería
// estructurar código que tiene fecha de vencimiento conocida — el tipo de
// abstracción "por las dudas" que venimos evitando en todo el proyecto.
export function parseLexicalSearchQuery(body: unknown): LexicalSearchQuery {
  if (typeof body !== 'object' || body === null) {
    throw new BadRequestException('El cuerpo de la petición debe ser un objeto JSON');
  }

  const { query, topK } = body as Record<string, unknown>;

  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new BadRequestException('"query" es requerido y debe ser un string no vacío');
  }

  const resolvedTopK = topK === undefined ? DEFAULT_TOP_K : topK;
  if (
    typeof resolvedTopK !== 'number' ||
    !Number.isInteger(resolvedTopK) ||
    resolvedTopK < 1 ||
    resolvedTopK > MAX_TOP_K
  ) {
    throw new BadRequestException(`"topK" debe ser un entero entre 1 y ${MAX_TOP_K}`);
  }

  return { query: query.trim(), topK: resolvedTopK };
}