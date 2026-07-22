# Capability: pdf-ingestion

> Estado: propuesto (se implementa en `changes/0002-pdf-ingestion`). Este archivo se
> actualiza a "implementado" cuando la última tarea de `tasks.md` se complete.

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

## Requirement: Extracción de texto

El sistema DEBE extraer el texto plano completo del PDF antes de trocearlo.

### Scenario: PDF con texto extraíble
- **GIVEN** un PDF con texto seleccionable (no escaneado como imagen)
- **WHEN** se ejecuta la extracción
- **THEN** se obtiene una cadena de texto no vacía correspondiente al contenido del libro

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

### Scenario: Metadata consistente
- **GIVEN** un documento ingerido con éxito
- **WHEN** se consultan sus chunks
- **THEN** cada chunk tiene un `index` consecutivo empezando en 0 y `startOffset` menor
  que `endOffset`