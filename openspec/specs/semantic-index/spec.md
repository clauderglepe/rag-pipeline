# Capability: semantic-index

> Estado: **implementado** (`changes/0003-semantic-index`).

## Requirement: Indexación de un documento ya ingerido

El sistema DEBE poder generar embeddings para todos los chunks de un documento
previamente ingerido (Fase 1) y almacenarlos en el índice vectorial.

### Scenario: Indexación exitosa
- **GIVEN** un documento ya ingerido con N chunks (vía `POST /documents`)
- **WHEN** el cliente hace `POST /documents/:documentId/index`
- **THEN** el sistema responde `201 Created` con `{ documentId, embeddedCount }`, donde
  `embeddedCount` es igual a N

### Scenario: Documento inexistente
- **GIVEN** un `documentId` que no existe en `ChunkRepository`
- **WHEN** el cliente hace `POST /documents/:documentId/index`
- **THEN** el sistema responde `404 Not Found`

### Scenario: Ollama no disponible
- **GIVEN** el servicio de Ollama no está corriendo o el modelo configurado no está
  descargado
- **WHEN** el cliente hace `POST /documents/:documentId/index`
- **THEN** el sistema responde `503 Service Unavailable` con un mensaje que indica
  revisar que Ollama esté corriendo y el modelo descargado

## Requirement: Generación de embeddings en lotes

El sistema DEBE generar los embeddings de los chunks de un documento en lotes de tamaño
configurable (no una petición HTTP por chunk, ni una única petición con todos los
chunks del documento).

### Scenario: Documento con más chunks que el tamaño de lote
- **GIVEN** un documento con 100 chunks y un tamaño de lote configurado en 32
- **WHEN** se indexa el documento
- **THEN** se realizan 4 llamadas a `EmbeddingProvider` (3 lotes de 32 y uno de 4), no
  100 llamadas individuales ni 1 sola con los 100 chunks

## Requirement: Reindexar un documento es idempotente

Al indexar un documento que ya tenía entradas previas en el índice vectorial, el sistema
DEBE reemplazarlas, no acumularlas.

### Scenario: Reindexar el mismo documento dos veces
- **GIVEN** un documento ya indexado con N chunks
- **WHEN** se ejecuta `POST /documents/:documentId/index` una segunda vez sobre el mismo
  documento
- **THEN** el índice vectorial contiene exactamente N entradas para ese `documentId`,
  no 2N

## Requirement: Búsqueda semántica (índice aislado)

> Este requirement describe un endpoint **temporal**, usado solo para validar el índice
> semántico de forma aislada antes de que exista la fusión híbrida (`0005`). Se retira
> cuando el endpoint público de búsqueda híbrida esté implementado.

El sistema DEBE poder devolver, para una consulta en texto libre, los `k` chunks de un
documento ya indexado más similares semánticamente, ordenados por score descendente.

### Scenario: Búsqueda con resultados
- **GIVEN** un documento ya indexado
- **WHEN** el cliente hace `POST /documents/:documentId/debug/semantic-search` con
  `{ query, topK }`
- **THEN** el sistema responde con una lista de a lo sumo `topK` resultados, cada uno
  con `{ chunkId, score, page, text }`, ordenados de mayor a menor `score`

### Scenario: Documento no indexado todavía
- **GIVEN** un documento ingerido pero no indexado (`POST /documents/:id/index` no se
  ejecutó)
- **WHEN** el cliente hace `POST /documents/:documentId/debug/semantic-search`
- **THEN** el sistema responde `200 OK` con una lista vacía `[]` — es un resultado
  válido (documento sin entradas en el índice vectorial), no un error. Solo se responde
  `404` cuando el `documentId` nunca fue ingerido (no existe en `ChunkRepository`)

## Requirement: Similitud coseno vía producto punto sobre vectores normalizados internamente

El índice vectorial DEBE normalizar a longitud unitaria (L2) cada vector que recibe
—tanto al guardarlo como al recibir una consulta— antes de calcular el score como
producto punto. No DEBE asumir que el proveedor de embeddings ya entrega vectores
normalizados (ver `design.md` §2).

### Scenario: Vectores idénticos
- **GIVEN** un chunk cuyo embedding es idéntico al de la consulta
- **WHEN** se calcula el score
- **THEN** el score es 1 (o muy cercano a 1, dentro de tolerancia de punto flotante)

### Scenario: Proveedor que no normaliza
- **GIVEN** un `EmbeddingProvider` que devuelve vectores sin normalizar (norma ≠ 1)
- **WHEN** esos vectores se guardan y se consultan en el índice
- **THEN** el score calculado sigue siendo una similitud coseno matemáticamente correcta