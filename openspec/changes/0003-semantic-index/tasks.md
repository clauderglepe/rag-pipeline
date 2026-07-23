# Tareas — 0003-semantic-index

Cada tarea marcada corresponde a un commit atómico (Conventional Commits entre paréntesis).

- [ ] Instalar `@nestjs/config`, registrar `ConfigModule` en `AppModule` con validación de
      variables de entorno requeridas (`chore: add config module`)
- [ ] Crear módulo `index` con estructura de carpetas (`chore(index): scaffold module`)
- [ ] Definir `EmbeddingProvider` (interfaz) + `VectorIndex` (interfaz), incluyendo sus
      tokens de inyección (`feat(index): add embedding and vector index interfaces`)
- [ ] Implementar `OllamaEmbeddingProvider` (llama a `POST /api/embed`, batching
      configurable) + tests unitarios con `fetch` mockeado
      (`feat(index): add ollama embedding provider`)
- [ ] Implementar `InMemoryVectorIndex` (producto punto, ver `design.md` §2) + tests
      unitarios (orden de resultados, filtro por `documentId`, top-k)
      (`feat(index): add in-memory vector index`)
- [ ] Implementar `IndexingService` (orquesta chunks → embeddings → vector index) + test
      unitario con `EmbeddingProvider`/`VectorIndex`/`ChunkRepository` mockeados
      (`feat(index): add indexing service`)
- [ ] Implementar `IndexController` con `POST /documents/:id/index`, manejando el caso
      de Ollama no disponible con `503` (`feat(index): add document indexing endpoint`)
- [ ] Implementar el endpoint temporal `POST /documents/:id/debug/semantic-search`
      (`feat(index): add temporary semantic search debug endpoint`)
- [ ] Test de integración: ingerir el PDF fixture real, indexarlo (requiere Ollama
      corriendo — documentar cómo saltar este test si Ollama no está disponible), y
      verificar que una búsqueda semántica trivial devuelve resultados coherentes
      (`test(index): add semantic indexing integration test`)
- [ ] Actualizar `openspec/specs/semantic-index/spec.md` como implementado
      (`docs(openspec): mark semantic-index spec as implemented`)
- [ ] Actualizar checklist de Fase 2 en el README raíz (`docs: mark phase 2 as done`)

## Definición de "hecho"

- `npm run test` pasa (unitarios de este módulo).
- Con Ollama corriendo y el PDF real ya ingerido: `POST /documents/:id/index` responde
  con el número de chunks embebidos, y `POST /documents/:id/debug/semantic-search` con
  una pregunta del libro devuelve al menos un resultado con score razonable (> 0).
- El spec en `openspec/specs/` refleja el comportamiento real.

## Nota sobre el test de integración con Ollama

A diferencia del test e2e de la Fase 1 (autocontenido, sin dependencias externas), este
test necesita Ollama corriendo con `nomic-embed-text` descargado. Dos opciones a decidir
al implementar la tarea:
1. Dejarlo como test normal, documentando el requisito en el README de tests.
2. Marcarlo condicional (`describe.skip` si una variable de entorno como
   `SKIP_OLLAMA_TESTS` está presente), para no romper `npm run test:e2e` en un entorno
   sin Ollama (por ejemplo, un futuro pipeline de CI).

Se decide cuál al llegar a esa tarea, no ahora — no vale la pena resolver un problema de
CI que todavía no tenemos.