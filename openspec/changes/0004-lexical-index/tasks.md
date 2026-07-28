# Tareas — 0004-lexical-index

Cada tarea marcada corresponde a un commit atómico (Conventional Commits entre paréntesis).

- [x] Renombrar `POST /documents/:id/index` → `POST /documents/:id/index/semantic` en
      `IndexController`, y actualizar sus tests + el e2e de la Fase 2
      (`refactor(index): rename indexing endpoint to /index/semantic`)
- [x] Crear módulo `lexical` con estructura de carpetas (`chore(lexical): scaffold module`)
- [x] Implementar `Tokenizer` (función pura) + tests (minúsculas, split, tokens vacíos
      descartados, mismo resultado para el mismo texto en cualquier posición)
      (`feat(lexical): add shared tokenizer`)
- [x] Implementar `bm25.ts` (cálculo de IDF y score, funciones puras) + tests con casos
      calculados a mano (ver `design.md` §4 para la fórmula exacta)
      (`feat(lexical): add bm25 scoring functions`)
- [x] Definir `LexicalIndex` (interfaz, con `deleteByDocumentId` desde el inicio — ver
      `design.md` §5) (`feat(lexical): add lexical index interface`)
- [x] Implementar `Bm25LexicalIndex` + tests unitarios: orden de resultados, filtro por
      `documentId` obligatorio, idempotencia de reindexado (test explícito desde el
      inicio, no como corrección posterior)
      (`feat(lexical): add bm25 lexical index`)
- [x] Implementar `LexicalIndexingService` (orquesta chunks → tokenizar → guardar) + test
      unitario con `ChunkRepository`/`LexicalIndex` mockeados
      (`feat(lexical): add lexical indexing service`)
- [x] Implementar `LexicalController` con `POST /documents/:id/index/lexical`
      (`feat(lexical): add document lexical indexing endpoint`)
- [x] Implementar el endpoint temporal `POST /documents/:id/debug/lexical-search`
      (validación manual del DTO, mismo criterio que la Fase 2 tarea 7)
      (`feat(lexical): add temporary lexical search debug endpoint`)
- [x] Test de integración: ingerir el PDF fixture real, indexarlo léxicamente, y
      verificar que una búsqueda por un término exacto conocido del libro (no una
      paráfrasis — ahí es donde BM25 debería ganarle a lo semántico) devuelve el chunk
      correcto (`test(lexical): add lexical indexing integration test`)
- [x] Actualizar `openspec/specs/lexical-index/spec.md` como implementado
      (`docs(openspec): mark lexical-index spec as implemented`)
- [x] Actualizar checklist de Fase 3 en el README raíz (`docs: mark phase 3 as done`)

## Definición de "hecho"

- `npm run test` pasa (unitarios de este módulo y de los ajustados en `index`).
- `POST /documents/:id/index/lexical` seguido de
  `POST /documents/:id/debug/lexical-search` con un término exacto del libro (ej. un
  nombre propio o un código específico) devuelve ese chunk con score mayor a 0.
- El spec en `openspec/specs/` refleja el comportamiento real.

## Nota sobre el test de integración

A diferencia de la Fase 2, este test **no depende de Ollama** — BM25 es puro cálculo,
sin llamadas a servicios externos. No hace falta el patrón de detección
automática/timeout largo de la Fase 2; este test corre siempre, rápido, como el e2e de
la Fase 1.