# Capability: hybrid-retrieval

> Estado: propuesto (se implementa en `changes/0005-hybrid-retrieval`). Este archivo se
> actualiza a "implementado" cuando la última tarea de `tasks.md` se complete.

## Requirement: Búsqueda híbrida pública

El sistema DEBE exponer un endpoint público que combine los resultados del índice
semántico (Fase 2) y del índice léxico (Fase 3) usando Reciprocal Rank Fusion.

### Scenario: Búsqueda con resultados de ambos índices
- **GIVEN** un documento indexado tanto semántica como léxicamente
- **WHEN** el cliente hace `POST /documents/:documentId/search` con `{ query, topK }`
- **THEN** el sistema responde `200 OK` con una lista de a lo sumo `topK` resultados,
  cada uno con `{ chunkId, score, page, text, foundIn }`, ordenados por score
  descendente

### Scenario: Documento inexistente
- **GIVEN** un `documentId` que no existe en `ChunkRepository`
- **WHEN** el cliente hace `POST /documents/:documentId/search`
- **THEN** el sistema responde `404 Not Found`

### Scenario: Documento indexado en un solo índice
- **GIVEN** un documento indexado solo semánticamente (o solo léxicamente), no en ambos
- **WHEN** el cliente hace `POST /documents/:documentId/search`
- **THEN** el sistema responde `200 OK` con los resultados disponibles del único índice
  poblado — no falla ni exige que ambos estén indexados

## Requirement: Fusión por Reciprocal Rank Fusion (RRF)

El score final de cada chunk DEBE calcularse como la suma de `1 / (k + rank)` por cada
lista rankeada (semántica, léxica) en la que aparece, con `k = 60`. Los scores
originales de cada índice (similitud coseno, BM25) NO se usan directamente en el
cálculo — ver `design.md` §1.

### Scenario: Un chunk que aparece en ambas listas puntúa más que si apareciera en una sola
- **GIVEN** un chunk en el puesto 3 de la lista semántica y puesto 5 de la léxica
- **AND** otro chunk en el puesto 1 de la lista semántica pero ausente de la léxica
- **WHEN** se calcula el score RRF de ambos
- **THEN** el primero puede superar al segundo si la suma de sus dos contribuciones
  (`1/(60+3) + 1/(60+5)`) es mayor que la contribución única del segundo (`1/(60+1)`)

## Requirement: Trazabilidad del origen de cada resultado

Cada resultado DEBE indicar de qué índice(s) provino (`foundIn`), para poder observar
si la fusión está aportando valor real de ambos índices o de uno solo.

### Scenario: Resultado encontrado por ambos índices
- **GIVEN** un chunk presente en el pool de candidatos semántico y en el léxico
- **WHEN** aparece en el resultado final
- **THEN** su campo `foundIn` es `["semantic", "lexical"]`

### Scenario: Resultado encontrado por un solo índice
- **GIVEN** un chunk presente solo en el pool de candidatos léxico (ej. por una
  coincidencia de término exacto que lo semántico no priorizó)
- **WHEN** aparece en el resultado final
- **THEN** su campo `foundIn` es `["lexical"]`

## Requirement: Retiro de los endpoints de debug

Los endpoints temporales de la Fase 2 y 3 (`POST /documents/:id/debug/semantic-search`,
`POST /documents/:id/debug/lexical-search`) DEBEN dejar de existir una vez implementada
esta capability.

### Scenario: Los endpoints de debug ya no responden
- **GIVEN** la Fase 4 implementada
- **WHEN** el cliente hace `POST` a cualquiera de las dos rutas de debug
- **THEN** el sistema responde `404 Not Found` de enrutamiento (la ruta no existe), no
  un `404` de "documento no encontrado"