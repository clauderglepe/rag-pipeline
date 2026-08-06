# Capability: rag-query

> Estado: implementado (`changes/0006-rag-generation`).

## Requirement: Endpoint público de pregunta-respuesta

El sistema DEBE exponer un endpoint público que reciba una pregunta sobre un documento, recupere contexto relevante (Fase 4) y genere una respuesta (esta fase).

### Scenario: Pregunta con contexto disponible
- **GIVEN** un documento indexado (semántica y/o léxicamente) con contenido relevante
  a la pregunta
- **WHEN** el cliente hace `POST /documents/:documentId/query` con `{ query }`
- **THEN** el sistema responde `200 OK` con `{ answer, sources }`, donde `sources` es una lista de los chunks usados como contexto (`chunkId`, `page`, `foundIn`)

### Scenario: Documento inexistente
- **GIVEN** un `documentId` que no existe en `ChunkRepository`
- **WHEN** el cliente hace `POST /documents/:documentId/query`
- **THEN** el sistema responde `404 Not Found`

### Scenario: Documento sin contexto indexado
- **GIVEN** un documento ingerido pero no indexado en ningún índice todavía
- **WHEN** el cliente hace `POST /documents/:documentId/query`
- **THEN** el sistema responde `200 OK` con una respuesta indicando que no hay contenido indexado, sin haber llamado al LLM (ver `design.md` §4) — `sources` es una lista vacía

## Requirement: Tamaño de contexto fijo

El sistema DEBE recuperar una cantidad fija de chunks de contexto (no configurable por el cliente en esta fase) antes de generar la respuesta.

### Scenario: Cantidad de contexto
- **GIVEN** cualquier pregunta sobre un documento con más chunks relevantes disponibles que el tamaño fijo de contexto
- **WHEN** se procesa la pregunta
- **THEN** solo se usan como contexto la cantidad fija de chunks definida (`CONTEXT_TOP_K` en `design.md` §3), no todos los disponibles