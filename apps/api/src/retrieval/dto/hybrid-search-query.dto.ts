// Validación manual — mismo criterio que las Fases 2 y 3 (ADR-0001 §6: la librería
// de validación de DTOs se decide en la Fase 6).
// Implementación real: tarea "feat(retrieval): add hybrid search endpoint"
import { BadRequestException } from '@nestjs/common';

export interface HybridSearchQuery {
  query: string;
  topK: number;
}

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 50;

// Validación manual — aunque este endpoint ya no es "de debug" (a diferencia de
// semantic-search-query.dto.ts y lexical-search-query.dto.ts, que se retiran en esta
// misma fase), la decisión de qué librería usar para DTOs de HTTP sigue pospuesta a
// la Fase 6 (ADR-0001 §6). Que el endpoint sea permanente no cambia esa decisión.

export function parseHybridSearchQuery(body: unknown): HybridSearchQuery {
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