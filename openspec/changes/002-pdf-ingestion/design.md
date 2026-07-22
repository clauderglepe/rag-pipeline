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

## 3. Metadata del chunk: página exacta, no aproximada

**Decisión (actualizada):** cada chunk guarda `page`, calculado buscando en qué rango
`[startOffset, endOffset)` de página cae el `startOffset` del chunk.

**Historial de esta decisión:** en la versión inicial de este documento, `pdf-parse`
(v1) no exponía límites de página de forma nativa, así que `approxPage` se calculaba
dividiendo el offset de caracteres entre el promedio de caracteres por página del
documento completo — una estimación, etiquetada explícitamente como tal en el nombre del
campo (`approxPage`, no `page`).

Al migrar a `pdf-parse` v2 (`PDFParse` + `getText()`), la librería devuelve
`result.pages: { num, text }[]` — el texto real de cada página, ya troceado por el propio
parser. `PdfExtractorService.extract()` reconstruye `fullText` concatenando esas páginas
y registra el `startOffset`/`endOffset` real de cada una en `ExtractedPage`. Con eso,
`ChunkingService.findPage()` ya no estima nada: busca el rango de página exacto que
contiene el offset del chunk.

**Consecuencia:** se elimina la necesidad del script de validación
`validate-approx-page.ts` que existía para medir el desvío de la heurística — no hay
heurística que validar. El campo se renombra de `approxPage` a `page` en todo el módulo
(`RawChunk`, `Chunk`, specs) para reflejar que ya no es una aproximación.

**Caso límite:** si un offset cae exactamente en el separador (`\n\n`) que
`PdfExtractorService` inserta entre dos páginas, `findPage()` asigna la última página
conocida antes de ese offset — un chunk no puede "no tener página", pero sí puede
empezar justo en el límite entre dos.

## 4. Estructura de módulo NestJS

```
apps/api/src/ingestion/
  ingestion.module.ts
  ingestion.controller.ts        (POST /documents)
  ingestion.service.ts           (orquesta: extract → chunk → save)
  pdf-extractor.service.ts       (wrapper de pdf-parse v2 — PDFParse.getText())
  chunking.service.ts            (fixed-size + overlap, puro, fácil de testear)
  chunk-repository.interface.ts
  in-memory-chunk-repository.ts
  dto/upload-document.dto.ts
  dto/document-response.dto.ts
```

`chunking.service.ts` es una función pura (texto + páginas → lista de chunks) sin
dependencias de NestJS, para poder testearla con Jest sin levantar el módulo completo.