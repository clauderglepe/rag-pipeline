# Design — 0002-pdf-ingestion

## 1. Conteo de tokens para el chunking: aproximado, no exacto

**Decisión:** contar "tokens" como palabras separadas por espacio/puntuación (un split
simple), no usar un tokenizer real tipo BPE.

**Alternativas consideradas:**

| Opción | Precisión | Costo |
|---|---|---|
| **Split por palabras (aprox.)** | ✅ Suficiente para decidir tamaño de chunk | Cero dependencias |
| `gpt-tokenizer` / `tiktoken` (npm) | Conteo exacto de tokens estilo GPT | Dependencia extra; el conteo exacto de *ese* tokenizer no corresponde necesariamente al del modelo de Ollama que usemos |
| Tokenizer nativo del modelo de Ollama | Exacto para el modelo real | Ollama no expone un endpoint de tokenización simple de usar aquí |

**Justificación:** en esta fase el conteo de tokens solo decide *dónde cortar* el texto,
no un límite duro de contexto del LLM (eso se maneja en la Fase 5, con el prompt final).
Un conteo aproximado por palabras es suficiente y evita atarnos a un tokenizer que no
coincide con el modelo real. Si en la Fase 8 (evaluación) vemos que el tamaño de chunk
importa mucho para la calidad de recuperación, revisamos esta decisión con datos reales.

## 2. Repositorio de chunks: en memoria

**Decisión:** `ChunkRepository` es una interfaz con una única implementación
`InMemoryChunkRepository` (un array + un `Map` por `documentId`).

**Por qué:** en esta fase solo existe un documento por sesión de proceso; no hay
necesidad real de persistencia durable todavía (perder los chunks al reiniciar el backend
es aceptable mientras aprendemos el pipeline). La interfaz existe para que, cuando se
decida añadir persistencia (Postgres, SQLite, lo que sea — ver Fase 9), el resto del
sistema (índices, retrieval) no cambie una sola línea.

## 3. Metadata del chunk

Cada chunk guarda `approxPage` calculado dividiendo el offset de caracteres entre el
promedio de caracteres por página del documento (`pdf-parse` no da offsets por página
de forma nativa). Es una aproximación **etiquetada como tal** en el DTO
(`approxPage`, no `page`), para no aparentar una precisión que no tenemos. Si en el
frontend (Fase 7) el usuario necesita ir exactamente a la página, evaluamos entonces
`pdfjs-dist` (que sí da posición por página) como reemplazo del extractor.

## 4. Estructura de módulo NestJS

```
apps/api/src/ingestion/
  ingestion.module.ts
  ingestion.controller.ts        (POST /documents)
  ingestion.service.ts           (orquesta: extract → chunk → save)
  pdf-extractor.service.ts       (wrapper de pdf-parse)
  chunking.service.ts            (fixed-size + overlap, puro, fácil de testear)
  chunk-repository.interface.ts
  in-memory-chunk-repository.ts
  dto/upload-document.dto.ts
  dto/document-response.dto.ts
```

`chunking.service.ts` es una función pura (texto → lista de chunks) sin dependencias de
NestJS, para poder testearla con Jest sin levantar el módulo completo.