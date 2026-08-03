# Tareas — 0006-rag-generation

Cada tarea marcada corresponde a un commit atómico (Conventional Commits entre paréntesis).

- [x] Agregar `OLLAMA_GENERATION_MODEL` al schema de Zod (`env.validation.ts`) y a
      `.env.example` (default `qwen2.5:7b-instruct`)
      (`chore(config): add ollama generation model env var`)
- [x] Crear módulo `generation` con estructura de carpetas
      (`chore(generation): scaffold module`)
- [x] Implementar `LlmProvider` (interfaz) + `OllamaLlmProvider` (`POST /api/chat`,
      manejo de errores igual que `OllamaEmbeddingProvider`) + tests unitarios con
      `fetch` mockeado (`feat(generation): add ollama llm provider`)
- [x] Implementar `buildPrompt()` (función pura) + tests (formato del contexto,
      pregunta preservada tal cual, caso de contexto vacío)
      (`feat(generation): add prompt builder`)
- [ ] Implementar `GenerationService` (orquesta `buildPrompt` + `LlmProvider`) + test
      unitario con `LlmProvider` mockeado (`feat(generation): add generation service`)
- [ ] Crear módulo `query` con estructura de carpetas
      (`chore(query): scaffold module`)
- [ ] Implementar `QueryService` (orquesta `RetrievalService` + `GenerationService`,
      maneja el caso de contexto vacío sin llamar al LLM — ver `design.md` §4) + test
      unitario con ambos servicios mockeados (`feat(query): add query service`)
- [ ] Implementar `QueryController` con `POST /documents/:id/query`
      (validación  manual del DTO) (`feat(query): add rag query endpoint`)
- [ ] Test de integración: ingerir + indexar (ambos índices) el PDF fixture real, y
      verificar que `POST /documents/:id/query` devuelve una respuesta no vacía que
      cita al menos una página presente en el contexto recuperado
      (`test(query): add rag query integration test`)
- [ ] Actualizar `openspec/specs/rag-generation/spec.md` y
      `openspec/specs/rag-query/spec.md` como implementados
      (`docs(openspec): mark rag-generation and rag-query specs as implemented`)
- [ ] Actualizar checklist de Fase 5 en el README raíz (`docs: mark phase 5 as done`)

## Definición de "hecho"

- `npm run test` pasa (unitarios de ambos módulos nuevos).
- Con Ollama corriendo, el modelo de generación descargado (`ollama pull
  qwen2.5:7b-instruct`), y un documento ingerido + indexado en ambos índices:
  `POST /documents/:id/query` con `{ query: "<pregunta real sobre el libro>" }`
  devuelve `{ answer, sources }`, donde `answer` no está vacío y al menos una fuente en `sources` corresponde a un chunk realmente recuperado.
- Preguntar algo ausente del documento produce una respuesta que indica explícitamente que no hay información suficiente (verificación manual, no un assert automático sobre el contenido exacto generado por el LLM — ver nota abajo).
- Los specs en `openspec/specs/` reflejan el comportamiento real.

## Nota sobre qué se puede (y no se puede) testear automáticamente aquí

El contenido exacto de la respuesta del LLM no es determinístico — no se puede escribir un test que compare la respuesta contra un string exacto. El test de integración verifica propiedades estructurales (respuesta no vacía, cita al menos una página válida, `sources` no vacío cuando hay contexto), no el contenido semántico de la respuesta en si. Verificar que las respuestas son *buenas* (no solo bien formadas) es tarea de la Fase 8 (evaluación con un golden set de preguntas), no de este test.