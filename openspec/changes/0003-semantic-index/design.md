# Design — 0003-semantic-index

## 1. Endpoint de Ollama: `/api/embed`, no `/api/embeddings`

**Decisión:** usar `POST /api/embed` con `{ model, input: string[] }`.

**Por qué:** `/api/embeddings` es el endpoint original de Ollama, ya marcado como
superado en su propia documentación — acepta un único `prompt` por llamada (una petición
HTTP por chunk). `/api/embed` es el endpoint actual: acepta `input` como string **o array
de strings**, permitiendo mandar varios chunks en una sola petición (batching), y además
devuelve los vectores ya normalizados a longitud unitaria (L2-normalizados) — lo cual
aprovechamos en la decisión 2.

Con un libro de varios cientos de chunks, la diferencia entre "una petición HTTP por
chunk" y "un puñado de peticiones con lotes de N chunks" es real en tiempo total de
indexado, no solo un detalle cosmético de la API.

## 2. Similitud coseno = producto punto — normalizando dentro del propio índice, no confiando en el proveedor

**Decisión:** `InMemoryVectorIndex` normaliza a longitud unitaria (L2) cada vector
**él mismo**, tanto al guardarlo (`add()`) como al recibir el vector de consulta
(`search()`), y luego calcula el score como producto punto simple (`Σ aᵢ·bᵢ`).

**Por qué no confiar en que el proveedor ya normaliza:** es cierto que `/api/embed` de
Ollama devuelve vectores L2-normalizados hoy, y podríamos ahorrarnos la normalización
aprovechando eso. Pero esa es una propiedad de un componente externo que no controlamos,
y que ya sabemos que planeamos cambiar: el plan (§3.3) deja `transformers.js` como
alternativa de runtime de embeddings, y sus modelos (ej. `Xenova/all-MiniLM-L6-v2`)
**no** normalizan por defecto — hay que pedirlo explícitamente. Si migráramos y se nos
olvidara ese detalle, el bug sería silencioso: los scores seguirían pareciendo válidos
(números entre -1 y 1) pero estarían matemáticamente equivocados.

Normalizar dentro de `InMemoryVectorIndex` en vez de confiar en el proveedor cuesta una
raíz cuadrada y una división por componente — insignificante frente al costo real de
generar el embedding (una inferencia de red neuronal completa) — y elimina el problema
de raíz: cambiar de proveedor de embeddings, normalice o no, deja de poder romper este
componente. La propiedad "los vectores están normalizados" pasa de ser una promesa
externa a una garantía que el propio `VectorIndex` se encarga de cumplir.

```typescript
function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector; // vector nulo: evitar división por cero
  return vector.map((v) => v / norm);
}
```

## 3. `VectorIndex` no guarda el texto del chunk, solo `chunkId`

**Decisión:** las entradas del índice vectorial son `{ chunkId, documentId, vector }`.
El texto, la página, los offsets — todo eso sigue viviendo únicamente en
`ChunkRepository` (Fase 1).

**Por qué:** evita una fuente de verdad duplicada. Si el índice vectorial también
guardara el texto, tendríamos dos copias del mismo chunk que podrían desincronizarse
(por ejemplo, si algún día se re-chunkea un documento). `IndexingService` y quien
consuma resultados de búsqueda siempre resuelven el texto/metadata haciendo un lookup a
`ChunkRepository` por `chunkId` — un único punto de verdad, aunque implique un lookup
extra.

## 4. Configuración externa: `@nestjs/config`

**Decisión:** se introduce `@nestjs/config` para leer `OLLAMA_BASE_URL`,
`OLLAMA_EMBEDDING_MODEL` y `EMBEDDING_BATCH_SIZE` desde variables de entorno (con
defaults sensatos si no están definidas).

**Por qué ahora y no antes:** hasta la Fase 1, el proyecto no hablaba con ningún
servicio externo — no había nada que configurar. Esta es la primera pieza que depende de
una URL y un nombre de modelo que pueden cambiar entre tu máquina y la de otra persona
(o entre desarrollo y un futuro despliegue), así que es el punto natural para introducir
gestión de configuración, no antes por adelantado.

**Alternativa descartada:** hardcodear `http://localhost:11434` y `nomic-embed-text`
directamente en `OllamaEmbeddingProvider`. Se descarta porque el ADR-0001 ya anticipa
que el modelo de generación (Fase 5, mismo servicio Ollama) podría cambiar según el
hardware de quien corra el proyecto — si eso ya es una variable conocida, tiene sentido
resolverlo con configuración desde ya, en vez de repetir el mismo hardcode dos veces
(embeddings aquí, generación en la Fase 5) y luego migrar ambos.

## 5. Batching de embeddings con tamaño configurable

**Decisión:** `IndexingService` no manda todos los chunks del documento en una sola
llamada a `EmbeddingProvider.embed()`; los agrupa en lotes de `EMBEDDING_BATCH_SIZE`
(default: 32).

**Por qué:** un libro puede tener miles de chunks. Aunque `/api/embed` acepta un array
completo, una única petición HTTP con miles de textos corre el riesgo de timeout del
lado del cliente HTTP y hace más difícil dar progreso/logging incremental durante el
indexado. Lotes de tamaño moderado son un punto intermedio razonable entre "una petición
por chunk" (Fase anterior de la API de Ollama) y "todo en una sola petición gigante".

## 6. Manejo de errores: Ollama no disponible

**Decisión:** si `OllamaEmbeddingProvider` no puede conectar con Ollama (servicio caído,
modelo no descargado), `IndexingService` propaga un error que el controller traduce a
`503 Service Unavailable` con un mensaje explícito ("¿Ollama está corriendo? ¿el modelo
está descargado con `ollama pull`?"), no un `500` genérico.

**Por qué:** un `500` genérico no le dice a quien está aprendiendo el sistema qué hacer
al respecto; un `503` con el mensaje correcto señala directamente el paso de
`docker-compose`/`ollama pull` de la Fase 0 que probablemente falta.

## 7. Estructura de módulo NestJS

```
apps/api/src/index/
  index.module.ts
  index.controller.ts              (POST /documents/:id/index,
                                     POST /documents/:id/debug/semantic-search — temporal)
  indexing.service.ts               (orquesta: leer chunks → embed → guardar en VectorIndex)
  embedding-provider.interface.ts
  ollama-embedding.provider.ts
  vector-index.interface.ts
  in-memory-vector-index.ts
  dto/index-response.dto.ts
  dto/semantic-search-result.dto.ts
```