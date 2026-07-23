# Capability: pdf-ingestion

> Estado: **implementado** (`changes/0002-pdf-ingestion`).

## Requirement: Subida de documento

El sistema DEBE aceptar la subida de un único archivo PDF vía `multipart/form-data`.

### Scenario: Subida exitosa
- **GIVEN** un archivo PDF válido de menos de 20MB
- **WHEN** el cliente hace `POST /documents` con el archivo en el campo `file`
- **THEN** el sistema responde `201 Created` con `{ documentId, chunkCount }`

### Scenario: Tipo de archivo no soportado
- **GIVEN** un archivo que no es PDF (ej. `.docx`, `.txt`)
- **WHEN** el cliente hace `POST /documents`
- **THEN** el sistema responde `400 Bad Request` con un mensaje indicando el tipo
  esperado

### Scenario: Archivo demasiado grande
- **GIVEN** un PDF de más de 20MB
- **WHEN** el cliente hace `POST /documents`
- **THEN** el sistema responde `413 Payload Too Large`

### Scenario: Sin archivo adjunto
- **GIVEN** una petición `POST /documents` sin campo `file`
- **WHEN** el cliente hace la petición
- **THEN** el sistema responde `400 Bad Request`

## Requirement: Extracción de texto

El sistema DEBE extraer el texto plano de cada página del PDF antes de trocearlo.

### Scenario: PDF con texto extraíble
- **GIVEN** un PDF con texto seleccionable (no escaneado como imagen)
- **WHEN** se ejecuta la extracción
- **THEN** se obtiene, por cada página, un texto no vacío correspondiente a esa página,
  y un `fullText` que es la concatenación de todas ellas

### Scenario: PDF corrupto o sin texto extraíble
- **GIVEN** un PDF corrupto, o un PDF escaneado sin capa de texto
- **WHEN** el cliente hace `POST /documents`
- **THEN** el sistema responde `400 Bad Request` indicando que no se pudo extraer texto

## Requirement: Chunking de tamaño fijo con solapamiento

El sistema DEBE dividir el texto extraído en chunks de ~500 tokens (aprox., conteo por
palabras) con un solapamiento de 50 tokens entre chunks consecutivos.

### Scenario: Documento más largo que un chunk
- **GIVEN** un texto de 1200 tokens aproximados
- **WHEN** se ejecuta el chunking con tamaño 500 y overlap 50
- **THEN** se generan 3 chunks, donde el final del chunk N y el inicio del chunk N+1
  comparten aproximadamente 50 tokens

### Scenario: Documento más corto que un chunk
- **GIVEN** un texto de 300 tokens aproximados
- **WHEN** se ejecuta el chunking con tamaño 500
- **THEN** se genera un único chunk con todo el texto

## Requirement: Metadata de cada chunk

Cada chunk generado DEBE incluir: `id`, `documentId`, `index` (posición secuencial),
`text`, `startOffset`, `endOffset`, `page`.

El campo `page` DEBE ser la página real del documento en la que empieza el chunk,
calculada a partir de los límites de página exactos que devuelve el extractor de PDF
(no una estimación).

### Scenario: Metadata consistente
- **GIVEN** un documento ingerido con éxito
- **WHEN** se consultan sus chunks
- **THEN** cada chunk tiene un `index` consecutivo empezando en 0, `startOffset` menor
  que `endOffset`, y `page` correspondiente al rango de página real que contiene
  `startOffset`

## Requirement: Persistencia de los chunks (alcance actual)

Los chunks generados DEBEN quedar disponibles para su consulta por `documentId` mientras
el proceso del backend siga corriendo. No se requiere persistencia entre reinicios en
esta fase (ver plan, Fase 9, para el alcance futuro de persistencia durable).

### Scenario: Consulta tras la ingesta
- **GIVEN** un documento ingerido con éxito en `documentId`
- **WHEN** se consulta el repositorio de chunks por ese `documentId`
- **THEN** se obtienen exactamente los chunks generados para ese documento, ni más ni menos