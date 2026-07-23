# Propuesta: Índice semántico (embeddings + vector store)

## Por qué

Con los chunks del libro ya generados y disponibles (Fase 1), necesitamos poder
encontrar cuáles son semánticamente relevantes para una pregunta — eso requiere convertir
cada chunk en un vector (embedding) y poder comparar ese vector contra el de una consulta.
Esta es la primera de las dos piezas del retrieval híbrido; la segunda (BM25) es la
propuesta `0004`, independiente de esta.

## Qué cambia

Se introduce la capability **`semantic-index`**:

- `EmbeddingProvider` (interfaz) + `OllamaEmbeddingProvider`: genera embeddings llamando
  a Ollama (`POST /api/embed`, modelo `nomic-embed-text`, ya decidido en ADR-0001),
  con batching configurable para no mandar cientos de chunks en una sola petición HTTP.
- `VectorIndex` (interfaz) + `InMemoryVectorIndex`: almacena `{ chunkId, documentId,
  vector }` y responde búsquedas por similitud — **fuerza bruta**, ya decidido en
  ADR-0001 §2.
- `IndexingService`: lee los chunks de un documento desde `ChunkRepository` (Fase 1),
  pide sus embeddings a `EmbeddingProvider`, y los guarda en `VectorIndex`.
- Endpoint `POST /documents/:documentId/index`: dispara la indexación de un documento ya
  ingerido.
- Endpoint temporal `POST /documents/:documentId/debug/semantic-search`: para poder
  probar y validar el índice semántico de forma aislada, **antes** de que exista la
  fusión híbrida (Fase 4). Se marca explícitamente como temporal — se reemplaza por el
  endpoint público real de búsqueda cuando la fusión híbrida esté lista.
- Nueva dependencia: `@nestjs/config`, para no hardcodear la URL de Ollama ni los
  nombres de modelo (ver `design.md`, punto 4).

## Por qué indexar es un paso separado de subir el documento

`POST /documents` (Fase 1) sigue haciendo solo extracción + chunking — rápido, siempre
por debajo de un segundo para un libro. Generar embeddings de todos los chunks de un
libro completo, en cambio, puede tardar de varios segundos a un par de minutos según el
hardware (es inferencia de un modelo, no solo parsing). Meter eso en el mismo request
HTTP de la subida arriesga timeouts del lado del cliente y esconde, para quien está
aprendiendo el pipeline, que ingestión e indexado son dos etapas conceptualmente
distintas del RAG. Por eso quedan como dos llamadas explícitas y observables por
separado.

## Fuera de alcance (propuestas futuras)

- Índice léxico BM25 → `0004-lexical-index`.
- Fusión híbrida de ambos índices → `0005-hybrid-retrieval`. El endpoint de debug de
  esta propuesta se retira quen esa fase quede lista.
- Generación de respuestas con LLM → `0006-rag-generation`.
- Persistencia durable del vector store (hoy en memoria, se pierde al reiniciar) → fuera
  de alcance hasta la Fase 9 (multi-documento), igual que con los chunks.

Ver `design.md` para la justificación de las decisiones técnicas de esta fase.