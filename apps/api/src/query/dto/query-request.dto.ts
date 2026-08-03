import { BadRequestException } from '@nestjs/common';

export interface QueryRequest {
  query: string;
}

// Validación manual — mismo criterio que las Fases 2, 3 y 4 (ADR-0001 §6, ya cerrada
// en la propuesta 0007-api-contract con class-validator, pendiente de migrar).
//
// A diferencia de los DTOs de búsqueda anteriores (que sí recortaban espacios), este
// NO hace trim() — buildPrompt() (Fase 5, tarea 4) tiene un test explícito que
// verifica que la pregunta llega intacta hasta el LLM, sin modificaciones. Recortar
// acá rompería esa garantía antes de que la pregunta llegue tan lejos.
export function parseQueryRequest(body: unknown): QueryRequest {
  if (typeof body !== 'object' || body === null) {
    throw new BadRequestException('El cuerpo de la petición debe ser un objeto JSON');
  }

  const { query } = body as Record<string, unknown>;

  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new BadRequestException('"query" es requerido y debe ser un string no vacío');
  }

  return { query }; // se devuelve tal cual llegó, sin trim
}