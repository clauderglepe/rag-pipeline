# Capability: lexical-index

> Estado: propuesto (se implementa en `changes/0004-lexical-index`). Este archivo se
> actualiza a "implementado" cuando la última tarea de `tasks.md` se complete.

## Requirement: Indexación léxica de un documento ya ingerido

El sistema DEBE poder construir un índice BM25 para todos los chunks de un documento
previamente ingerido (Fase 1).

### Scenario: Indexación exitosa
- **GIVEN** un documento ya ingerido con N chunks
- **WHEN** el cliente hace `POST /documents/:documentId/index/lexical`
- **THEN** el sistema responde `201 Created` con `{ documentId, indexedCount }`, donde
  `indexedCount` es igual a N

### Scenario: Documento inexistente
- **GIVEN** un `documentId` que no existe en `ChunkRepository`
- **WHEN** el cliente hace `POST /documents/:documentId/index/lexical`
- **THEN** el sistema responde `404 Not Found`

## Requirement: Tokenización consistente entre indexado y consulta

El sistema DEBE usar la misma función de tokenización tanto al indexar chunks como al
procesar una consulta de búsqueda.

### Scenario: Un término se tokeniza igual en ambos contextos
- **GIVEN** un texto que contiene el término "EC2"
- **WHEN** ese texto se tokeniza como parte del indexado, y la consulta "EC2" se
  tokeniza al buscar
- **THEN** ambas tokenizaciones producen el mismo token para "EC2"

## Requirement: Búsqueda léxica (índice aislado)

> Este requirement describe un endpoint **temporal**, usado solo para validar el índice
> léxico de forma aislada antes de la fusión híbrida (`0005`). Se retira cuando el
> endpoint público de búsqueda híbrida esté implementado.

El sistema DEBE poder devolver, para una consulta en texto libre, los `k` chunks de un
documento ya indexado con mayor score BM25, ordenados de forma descendente.

### Scenario: Búsqueda con resultados
- **GIVEN** un documento ya indexado léxicamente
- **WHEN** el cliente hace `POST /documents/:documentId/debug/lexical-search` con
  `{ query, topK }`
- **THEN** el sistema responde con una lista de a lo sumo `topK` resultados, cada uno
  con `{ chunkId, score, page, text }`, ordenados de mayor a menor `score`

### Scenario: Término exacto favorece BM25 sobre lo que semántico encontraría
- **GIVEN** un documento que contiene un término técnico o nombre propio específico
  (ej. un acrónimo)
- **WHEN** se busca ese término exacto
- **THEN** el chunk que lo contiene aparece con un score notablemente mayor a 0,
  reflejando la coincidencia léxica exacta

## Requirement: `documentId` obligatorio en la búsqueda léxica

A diferencia del índice semántico, el `documentId` NO es opcional en una búsqueda BM25
— las estadísticas del corpus (IDF, longitud promedio) son relativas al conjunto de
chunks del documento (ver `design.md` §2).

### Scenario: Búsqueda sin documentId
- **GIVEN** una petición al endpoint de búsqueda léxica sin `documentId`
- **WHEN** el cliente intenta hacer la búsqueda
- **THEN** la petición es inválida (el `documentId` es parte de la ruta, no opcional)

## Requirement: Reindexar un documento es idempotente

Al indexar léxicamente un documento que ya tenía entradas previas, el sistema DEBE
reemplazarlas, no acumularlas — mismo requisito ya establecido para el índice semántico
(Fase 2), incorporado aquí desde el diseño inicial, no como corrección posterior.

### Scenario: Reindexar el mismo documento dos veces
- **GIVEN** un documento ya indexado léxicamente con N chunks
- **WHEN** se ejecuta `POST /documents/:documentId/index/lexical` una segunda vez sobre
  el mismo documento
- **THEN** el índice léxico contiene exactamente N entradas para ese `documentId`, no 2N