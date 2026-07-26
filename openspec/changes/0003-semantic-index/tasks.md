# Tareas — 0003-semantic-index

Cada tarea marcada corresponde a un commit atómico (Conventional Commits entre paréntesis).

- [x] Instalar `@nestjs/config`, registrar `ConfigModule` en `AppModule` con validación de
      variables de entorno requeridas (`chore: add config module`) — validación con
      Zod (ver ADR-0001 §6), no `class-validator`
- [x] Crear módulo `index` con estructura de carpetas (`chore(index): scaffold module`)
- [x] Definir `EmbeddingProvider` (interfaz) + `VectorIndex` (interfaz), incluyendo sus
      tokens de inyección (`feat(index): add embedding and vector index interfaces`)
- [x] Implementar `OllamaEmbeddingProvider` (llama a `POST /api/embed`, batching
      configurable) + tests unitarios con `fetch` mockeado
      (`feat(index): add ollama embedding provider`)
- [x] Implementar `InMemoryVectorIndex` (normalización interna + producto punto, ver
      `design.md` §2) + tests unitarios (orden de resultados, filtro por `documentId`,
      top-k, y explícitamente: scores correctos con vectores de entrada **sin**
      normalizar) (`feat(index): add in-memory vector index`)
- [x] Implementar `IndexingService` (orquesta chunks → embeddings → vector index) + test
      unitario con `EmbeddingProvider`/`VectorIndex`/`ChunkRepository` mockeados
      (`feat(index): add indexing service`) — incluye `fix(index): make document
      reindexing idempotent`, encontrado probando con datos reales (ver `design.md` §8)
- [x] Implementar `IndexController` con `POST /documents/:id/index`, manejando el caso
      de Ollama no disponible con `503` (`feat(index): add document indexing endpoint`)
- [x] Implementar el endpoint temporal `POST /documents/:id/debug/semantic-search`
      (`feat(index): add temporary semantic search debug endpoint`)
- [x] Test de integración: ingerir el PDF fixture real, indexarlo (requiere Ollama
      corriendo, con detección automática de disponibilidad — ver nota más abajo), y
      verificar que una búsqueda semántica trivial devuelve resultados coherentes,
      incluyendo un test de regresión de la idempotencia de reindexado
      (`test(index): add semantic indexing integration test`)
- [x] Actualizar `openspec/specs/semantic-index/spec.md` como implementado
      (`docs(openspec): mark semantic-index spec as implemented`)
- [ ] Actualizar checklist de Fase 2 en el README raíz (`docs: mark phase 2 as done`)

## Definición de "hecho"

- `npm run test` pasa (unitarios de este módulo).
- Con Ollama corriendo y el PDF real ya ingerido: `POST /documents/:id/index` responde
  con el número de chunks embebidos, y `POST /documents/:id/debug/semantic-search` con
  una pregunta del libro devuelve al menos un resultado con score razonable (> 0).
- El spec en `openspec/specs/` refleja el comportamiento real.

## Decisión tomada sobre el test de integración con Ollama

Se optó por la opción 1 con detección automática: el test hace un `GET /api/tags` con
timeout corto en `beforeAll()` y cada caso se salta (`return` temprano + `console.warn`)
si Ollama no responde — sin variable de entorno manual que recordar. Limitación aceptada:
un test "saltado" así figura como *passed* en el reporte de Jest, no como *skipped*; no se
consideró que valiera la pena traer una dependencia extra solo para corregir eso.