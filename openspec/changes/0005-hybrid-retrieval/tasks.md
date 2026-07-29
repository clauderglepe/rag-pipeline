# Tareas — 0005-hybrid-retrieval

Cada tarea marcada corresponde a un commit atómico (Conventional Commits entre paréntesis).

- [x] Verificar/agregar `exports: [IndexingService]` en `IndexModule` y
      `exports: [LexicalIndexingService]` en `LexicalModule`, si no estaban ya
      exportados (`refactor(index,lexical): export services for cross-module use`)
- [x] Crear módulo `retrieval` con estructura de carpetas
      (`chore(retrieval): scaffold module`)
- [x] Implementar `rrf.ts` (`reciprocalRankFusion`, función pura) + tests con listas
      rankeadas de ejemplo calculadas a mano (`feat(retrieval): add rrf fusion function`)
- [ ] Implementar `RetrievalService` (llama a ambos índices en paralelo, fusiona,
      resuelve metadata y `foundIn`) + test unitario con `IndexingService`/
      `LexicalIndexingService` mockeados (`feat(retrieval): add retrieval service`)
- [ ] Implementar `RetrievalController` con `POST /documents/:id/search`
      (`feat(retrieval): add hybrid search endpoint`)
- [ ] Eliminar `debugSemanticSearch` de `IndexController` + su DTO de query y tests
      (`refactor(index): remove temporary semantic search debug endpoint`)
- [ ] Eliminar `debugLexicalSearch` de `LexicalController` + su DTO de query y tests
      (`refactor(lexical): remove temporary lexical search debug endpoint`)
- [ ] Test de integración: ingerir + indexar (semántico y léxico) el PDF fixture real, y
      verificar que `POST /documents/:id/search` devuelve resultados fusionados
      coherentes, incluyendo al menos un caso donde `foundIn` muestre un resultado
      proveniente de un solo índice (`test(retrieval): add hybrid search integration test`)
- [ ] Actualizar `openspec/specs/hybrid-retrieval/spec.md` como implementado
      (`docs(openspec): mark hybrid-retrieval spec as implemented`)
- [ ] Actualizar checklist de Fase 4 en el README raíz (`docs: mark phase 4 as done`)

## Definición de "hecho"

- `npm run test` pasa (unitarios de este módulo, y los ajustados en `index`/`lexical`
  tras eliminar los endpoints de debug).
- Con un documento ingerido e indexado en ambos índices:
  `POST /documents/:id/search` con `{ query, topK }` devuelve resultados fusionados,
  cada uno con `{ chunkId, score, page, text, foundIn }`.
- Los dos endpoints de debug (`/debug/semantic-search`, `/debug/lexical-search`) ya no
  existen — confirmarlo con una petición manual que debe devolver `404 Not Found` de
  ruta (no de "documento no encontrado").
- El spec en `openspec/specs/` refleja el comportamiento real.

## Nota sobre el test de integración

A diferencia de los tests de integración de las Fases 2 y 3 por separado, este test
necesita **ambos** índices poblados (requiere Ollama para el semántico, igual que la
Fase 2) — reutiliza el mismo patrón de detección automática de disponibilidad de Ollama
que ya escribimos en `semantic-index.e2e-spec.ts`, no uno nuevo.