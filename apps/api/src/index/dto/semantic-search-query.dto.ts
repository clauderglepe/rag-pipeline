import { BadRequestException } from "@nestjs/common";

export class SemanticSearchQuery {
  query!: string;
  topK!: number;
}
const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 50;

// Validación manual, no con class-validator/Zod: este endpoint es temporal
// (se retira al llegar la fusión híbrida — ver proposal.md) y la librería de validación de DTOs "real" del proyecto se decide en la Fase 6 (ADR-0001 §6).
// No vale la pena adelantar esa decisión para código que no va a persistir.

export function parseSemanticSearchQuery(body: unknown): SemanticSearchQuery {
  if (typeof body!='object' || body === null)
    throw new BadRequestException('El cuerpo de la petición debe ser un objeto JSON');

  const { query, topK } = body as Record<string,unknown>;

  if (typeof query !='string' || query.trim().length === 0){
    throw new BadRequestException ('"query" es requerido y debe ser un string no vacío');
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