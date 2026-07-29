# Propuesta: Retrieval híbrido (fusión RRF)

## Por qué

El índice semántico (Fase 2) y el léxico (Fase 3) ya funcionan por separado, cada uno
con su propio endpoint de debug. Esta fase los combina en un único resultado de
búsqueda — la pieza que efectivamente hace "híbrido" al sistema, y la última antes de
poder generar respuestas con el LLM (Fase 5).

## Qué cambia

Se introduce la capability **`hybrid-retrieval`**, en un módulo nuevo (`src/retrieval/`,
coherente con el diagrama de arquitectura del plan original §2):

- `reciprocalRankFusion()` (función pura): combina N listas rankeadas en una sola,
  usando Reciprocal Rank Fusion — el método ya decidido en el plan §3.6, sin
  necesidad de normalizar escalas distintas (coseno vs. BM25).
- `RetrievalService`: llama a `IndexingService.semanticSearch()` (Fase 2) y
  `LexicalIndexingService.lexicalSearch()` (Fase 3) en paralelo, fusiona sus resultados,
  y arma la respuesta final con metadata de chunk (page, text) y **de qué índice(s)
  vino cada resultado** (ver `design.md` §5).
- Endpoint público (ya no temporal) `POST /documents/:documentId/search`.

## Qué se retira

Los dos endpoints de debug quedan sin uso una vez que existe la búsqueda híbrida real —
tal como quedó anotado desde que se crearon (Fase 2 y 3, ambas propuestas dijeron
explícitamente "se retira en la Fase 4/5"):

- `POST /documents/:documentId/debug/semantic-search`
- `POST /documents/:documentId/debug/lexical-search`

**Lo que NO se retira:** los métodos `IndexingService.semanticSearch()` y
`LexicalIndexingService.lexicalSearch()` siguen existiendo — eran la lógica real detrás
de esos endpoints, y `RetrievalService` los reutiliza directamente. Solo desaparece la
exposición HTTP "de debug", no la funcionalidad.

## Fuera de alcance (propuestas futuras)

- Generación de respuesta con LLM usando el contexto recuperado → `0006-rag-generation`
  (Fase 5), la que consume el resultado de este endpoint.
- Exponer el tamaño del pool de candidatos previo a la fusión, o el parámetro `k` de RRF,
  como configuración → quedan como constantes por ahora (ver `design.md` §2), mismo
  criterio que los parámetros de BM25 en la Fase 3.
- Decisión de librería de validación de DTOs → sigue pospuesta a la Fase 6 (ADR-0001
  §6). Aunque este endpoint ya no es "de debug", no cambia esa decisión: se valida a
  mano, igual que en las fases anteriores.

Ver `design.md` para el resto de las decisiones técnicas.