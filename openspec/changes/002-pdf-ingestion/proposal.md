# Propuesta: Ingesta y chunking del PDF

## Por qué

Antes de poder indexar nada (semántica o léxicamente), necesitamos un punto de entrada que
reciba el PDF, extraiga su texto y lo trocee en unidades (`chunks`) con metadata suficiente
para luego poder citar la fuente de una respuesta (página, posición).

## Qué cambia

Se introduce la capability **`pdf-ingestion`**:

- Endpoint `POST /documents`: recibe un PDF vía `multipart/form-data` (campo `file`).
- Validación: solo se acepta `application/pdf`, tamaño máximo 20MB (config, no hardcode).
- Extracción de texto con `pdf-parse`.
- Chunking de tamaño fijo con solapamiento (500 tokens aprox., overlap 50), cada chunk
  guarda: `id`, `documentId`, `index`, `text`, `startOffset`, `endOffset`, `approxPage`.
- Los chunks se guardan en un repositorio **en memoria** (interfaz `ChunkRepository`),
  no en disco ni en base de datos todavía.

## Fuera de alcance (propuestas futuras)

- Generar embeddings de los chunks → `0003-semantic-index`.
- Indexar con BM25 → `0004-lexical-index`.
- Persistencia durable (sobrevivir a un reinicio del proceso) → se evalúa si hace falta
  cuando pasemos a multi-documento (ver plan, Fase 9).

## Decisión de diseño clave

Ver `design.md` para la justificación de por qué el chunking usa un conteo aproximado de
tokens en vez de un tokenizer real, y por qué el repositorio de chunks es en memoria.