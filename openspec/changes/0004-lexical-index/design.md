# Design — 0004-lexical-index

## 1. Un único tokenizer, compartido entre indexado y consulta

**Decisión:** `Tokenizer` es una función pura en un archivo propio
(`src/lexical/tokenizer.ts`), usada tanto por `Bm25LexicalIndex.add()` (al indexar
chunks) como por el flujo de búsqueda (al tokenizar la query del usuario).

**Por qué:** si el texto de los chunks se tokeniza con una lógica y la consulta con
otra ligeramente distinta (por ejemplo, una normaliza acentos y la otra no), un término
que debería coincidir exactamente deja de encontrarse — un bug silencioso de
"vocabulario desincronizado", donde BM25 nunca falla con un error, simplemente da
scores de 0 sin que sea obvio por qué. Tener una única función usada en ambos lados
hace ese bug estructuralmente imposible, no solo "poco probable".

**Implementación (v1, deliberadamente simple):** minúsculas + split por `\W+` (todo lo
que no sea letra/número/guion bajo), descartando tokens vacíos. Sin stemming, sin
eliminación de stopwords, sin normalización de acentos todavía.

**Por qué no stemming/stopwords desde ya:** son mejoras de calidad de recuperación, no
requisitos para que BM25 funcione — igual que con el tamaño de chunk (Fase 1 §1), se
revisan en la Fase 8 (evaluación) si los resultados reales lo piden, no antes.

## 2. `documentId` obligatorio en `search()`, no opcional

**Decisión:** a diferencia de `VectorIndex.search()` (Fase 2, donde `documentId` es un
filtro opcional sobre una lista global), en `LexicalIndex.search()` el `documentId` es
un parámetro **requerido**.

**Por qué es una diferencia real, no una inconsistencia:** en similitud coseno, el
score de un chunk no depende de qué otros chunks existan en el índice — comparar contra
un documento o contra diez da el mismo número para ese chunk. En BM25 **no** es así: el
IDF de un término depende de cuántos chunks del corpus lo contienen, y la normalización
por longitud depende del promedio de longitud de chunk del corpus. "BM25 sobre todos los
documentos juntos" y "BM25 sobre un documento" son, matemáticamente, dos corpus
distintos con estadísticas distintas — no la misma búsqueda con un filtro aplicado
después. Forzar `documentId` evita mezclar accidentalmente las estadísticas de
documentos no relacionados el día que haya más de uno (Fase 9).

## 3. Estadísticas calculadas en el momento de la consulta, no precomputadas

**Decisión:** `Bm25LexicalIndex` guarda, por chunk, sus tokens crudos — no un índice
invertido precomputado con IDF ya calculado. El IDF y la longitud promedio del corpus se
calculan dentro de `search()`, sobre los chunks del `documentId` pedido.

**Por qué:** mismo criterio que la búsqueda por fuerza bruta del índice vectorial
(ADR-0001 §2) — a la escala de un solo libro (unos pocos miles de chunks), recalcular
estas estadísticas en cada búsqueda es computacionalmente insignificante, y evita tener
que invalidar/actualizar una estructura precomputada cada vez que se reindexa. Si en el
futuro (multi-documento, Fase 9) esto se vuelve un cuello de botella real, se revisa con
datos, no antes.

## 4. Fórmula e implementación de BM25

Para una query con términos `q1...qn` y un chunk `D`:

```
score(D, Q) = Σ IDF(qi) · ( f(qi, D) · (k1 + 1) ) / ( f(qi, D) + k1 · (1 - b + b · |D| / avgdl) )

IDF(qi) = ln( (N - n(qi) + 0.5) / (n(qi) + 0.5) + 1 )
```

Donde `N` = número de chunks en el corpus, `n(qi)` = número de chunks que contienen el
término `qi`, `f(qi, D)` = frecuencia del término en el chunk `D`, `|D|` = cantidad de
tokens del chunk, `avgdl` = longitud promedio de chunk en tokens.

**Parámetros:** `k1 = 1.5`, `b = 0.75` — los valores por defecto estándar (los mismos
que usan Lucene/Elasticsearch/OpenSearch), no un ajuste propio. El `+1` dentro del
logaritmo de IDF es la variante de Robertson que evita valores negativos cuando un
término aparece en más de la mitad de los chunks — la misma que usan esas librerías.

## 5. Idempotencia del reindexado: incluida desde el diseño, no descubierta después

**Decisión:** `LexicalIndex` incluye `deleteByDocumentId(documentId)` desde su primera
versión, y `LexicalIndexingService.indexDocument()` lo llama antes de agregar entradas
nuevas — igual patrón que se corrigió en `VectorIndex` (Fase 2 §8) después de
encontrarlo con datos reales.

**Por qué ahora sí desde el principio:** ya pagamos el costo de aprender esta lección en
la fase anterior — repetir el mismo error en un componente hermano sería ignorar algo
que ya sabemos. Se agrega un test explícito de reindexado idempotente desde la primera
versión de `Bm25LexicalIndex`, no como corrección posterior.

## 6. Parámetros de BM25: constantes, no variables de entorno

**Decisión:** `k1` y `b` son constantes en el código (`BM25_K1 = 1.5`, `BM25_B = 0.75`),
no leídas de `ConfigService`.

**Por qué:** a diferencia de `OLLAMA_BASE_URL` (Fase 2, ADR-0001 §4 — varía entre tu
máquina y la de otra persona), `k1`/`b` son parámetros de afinación de calidad de
recuperación, no de entorno de ejecución. No hay today ninguna necesidad real de
cambiarlos sin recompilar — si en la Fase 8 (evaluación con datos reales) se descubre
que vale la pena exponerlos, se agregan a la configuración en ese momento.

## 7. Estructura de módulo NestJS

```
apps/api/src/lexical/
  lexical.module.ts
  lexical.controller.ts            (POST /documents/:id/index/lexical,
                                     POST /documents/:id/debug/lexical-search — temporal)
  lexical-indexing.service.ts      (orquesta: leer chunks → tokenizar → guardar en LexicalIndex)
  tokenizer.ts                      (función pura, compartida indexado/consulta)
  bm25.ts                           (función pura: cálculo de IDF y score BM25)
  lexical-index.interface.ts
  bm25-lexical-index.ts
  dto/lexical-index-response.dto.ts
  dto/lexical-search-result.dto.ts
  dto/lexical-search-query.dto.ts   (validación manual, mismo criterio que Fase 2 tarea 7)
```

## 8. Renombre del endpoint de indexado semántico

`src/index/index.controller.ts`: la ruta `POST /documents/:documentId/index` pasa a ser
`POST /documents/:documentId/index/semantic`. Se actualizan sus tests (unitarios y el
e2e de la Fase 2) como parte de la primera tarea de esta fase, antes de escribir
ningún código nuevo de BM25 — para no mezclar un rename de alcance de la Fase 2 con
funcionalidad nueva de la Fase 3 en el mismo commit.