# Design — 0005-hybrid-retrieval

## 1. Fórmula de RRF y por qué no normalizar scores

**Fórmula** (ya anotada en el plan §3.6, implementada aquí por primera vez):

```
score(chunk) = Σ (por cada lista rankeada donde aparece) 1 / (k + rank_en_esa_lista)
```

Donde `rank` es la posición 1-indexada del chunk dentro de esa lista particular
(semántica o léxica), y `k = 60` (valor estándar de la literatura, el mismo que usan
Weaviate/Elastic).

**Por qué RRF ignora los scores originales (coseno, BM25) y usa solo la posición:** es
justamente la razón por la que se eligió este método en el plan — coseno vive en
`[0, 1]` (tras la normalización de la Fase 2) y BM25 no tiene techo fijo (Fase 3, `bm25.
spec.ts`). Sumar o promediar esas dos escalas directamente no tiene sentido matemático
sin normalizar antes, y normalizar introduce un hiperparámetro adicional (cómo escalar
cada una) que RRF evita por completo al no mirar los scores en absoluto, solo el orden.

## 2. Tamaño del pool de candidatos antes de fusionar: constante, no el `topK` final

**Decisión:** `RetrievalService` siempre pide un pool fijo de candidatos a cada índice
(`RRF_CANDIDATE_POOL_SIZE = 20`) antes de fusionar, independientemente de cuántos
resultados finales pida el cliente (`topK`, típicamente 5).

**Por qué no pedir directamente `topK` a cada índice:** un chunk puede estar en el
puesto 15 de la lista semántica y en el puesto 2 de la léxica — si a cada índice le
pidiéramos solo `topK=5`, ese chunk nunca entraría a la fusión aunque BM25 lo considere
muy relevante. Pedir un pool más amplio (20) a cada lista y fusionar sobre ese pool más
grande, recortando recién al final, evita perder candidatos fuertes en una sola lista
por quedar unos puestos afuera de un `topK` final más pequeño.

**Por qué una constante y no configurable:** mismo criterio que `k1`/`b` de BM25 (Fase 3,
`design.md` §6) — es un parámetro de calidad de recuperación, no de entorno de
ejecución. Se revisa en la Fase 8 (evaluación) si hace falta afinarlo, no antes.

## 3. Reutilizar los métodos de servicio existentes, no reimplementar la búsqueda

**Decisión:** `RetrievalService` llama directamente a
`IndexingService.semanticSearch()` (Fase 2) y `LexicalIndexingService.lexicalSearch()`
(Fase 3) — los mismos métodos que ya alimentaban los endpoints de debug.

**Por qué:** esos métodos ya resuelven document-not-found (`NotFoundException`),
resuelven metadata de chunk (`page`, `text`) contra `ChunkRepository`, y manejan el caso
de "documento no indexado todavía" (lista vacía) — reimplementar esa lógica en
`RetrievalService` sería duplicar código que ya funciona y ya está testeado. Los
endpoints de debug desaparecen; la lógica que los alimentaba, no.

**Consecuencia práctica:** si `documentId` no existe, `Promise.all()` sobre ambas
búsquedas falla con la misma `NotFoundException` que ya lanzaban ambos servicios — no
hace falta duplicar ese chequeo en `RetrievalService`.

## 4. Las dos búsquedas corren en paralelo

**Decisión:** `Promise.all([semanticSearch(...), lexicalSearch(...)])`, no secuencial.

**Por qué:** son independientes entre sí (ninguna depende del resultado de la otra), y
la semántica involucra una llamada de red a Ollama (potencialmente el paso más lento del
endpoint) — no hay razón para esperarla antes de empezar el cálculo de BM25, que es
instantáneo y podría estar listo mucho antes.

## 5. Metadata de "de qué índice vino cada resultado" (`foundIn`)

**Decisión:** cada resultado de la búsqueda híbrida incluye `foundIn:
('semantic' | 'lexical')[]` — indicando si ese chunk apareció en el pool semántico, en
el léxico, o en ambos.

**Por qué agregarlo (y por qué no está "de más"):** no cuesta nada calcularlo — ya
tenemos ambas listas de origen en memoria al momento de fusionar, es solo verificar
pertenencia a dos `Set`s. A cambio, da visibilidad real y gratuita sobre cómo está
funcionando la fusión (¿la mayoría de los resultados vienen de ambos índices, o BM25
está aportando hallazgos que lo semántico no encontraría solo?) — información
directamente útil para la Fase 8 (evaluación), y coherente con el objetivo de
aprendizaje del proyecto: ver *por qué* un resultado apareció, no solo que apareció.

## 6. Estructura de módulo NestJS

```
apps/api/src/retrieval/
  retrieval.module.ts
  retrieval.controller.ts          (POST /documents/:id/search — endpoint público real)
  retrieval.service.ts
  rrf.ts                            (función pura: reciprocalRankFusion)
  dto/hybrid-search-query.dto.ts    (validación manual, ver proposal.md — Fase 6 pospuesta)
  dto/hybrid-search-result.dto.ts
```

`RetrievalModule` importa `IndexModule` (Fase 2) y `LexicalModule` (Fase 3) para poder
inyectar `IndexingService` y `LexicalIndexingService` — ambos ya exportados desde sus
respectivos módulos si no lo estaban (verificar/agregar `exports` como parte de la
primera tarea de esta fase).

## 7. Limpieza de los endpoints de debug

Al retirar `debugSemanticSearch`/`debugLexicalSearch` de sus controllers, también se
eliminan sus DTOs de validación de query (`semantic-search-query.dto.ts`,
`lexical-search-query.dto.ts`, y sus tests) — eran específicos de esa exposición HTTP
temporal. **No se eliminan** `SemanticSearchResultDto`/`LexicalSearchResultDto`: siguen
siendo el tipo de retorno de `semanticSearch()`/`lexicalSearch()`, ahora consumidos
internamente por `RetrievalService` en vez de devueltos directamente por HTTP.