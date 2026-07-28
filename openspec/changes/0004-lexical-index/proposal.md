# Propuesta: Índice léxico (BM25)

## Por qué

El índice semántico (Fase 2) encuentra chunks por significado, pero falla en casos donde
la coincidencia léxica exacta importa más que la similitud vectorial — nombres propios,
códigos, términos técnicos poco frecuentes, acrónimos. BM25 es la segunda pieza del
retrieval híbrido (la primera, semántica, ya está lista); la fusión de ambas es la
Fase 4 (`0005-hybrid-retrieval`), todavía no esta.

## Qué cambia

Se introduce la capability **`lexical-index`**, en un módulo NestJS nuevo y separado
(`src/lexical/`), no dentro de `src/index/` — cada módulo corresponde a una capability
de OpenSpec, y BM25 es conceptualmente independiente de los embeddings aunque ambas
sirvan al mismo propósito final.

- `Tokenizer` (función pura, compartida): convierte texto en tokens normalizados —
  usada tanto al indexar como al consultar, para que el vocabulario sea el mismo en
  ambos lados (ver `design.md` §1).
- `LexicalIndex` (interfaz) + `Bm25LexicalIndex`: implementación propia del algoritmo
  Okapi BM25 (decisión ya tomada en el plan §3.5) — sin librerías de búsqueda de texto.
- Endpoint `POST /documents/:documentId/index/lexical`: construye el índice léxico de
  un documento ya ingerido.
- Endpoint temporal `POST /documents/:documentId/debug/lexical-search`: para validar el
  índice de forma aislada, igual que se hizo con el semántico en la Fase 2 — se retira
  en la Fase 4.

## Cambio de nombre en un endpoint existente (Fase 2)

`POST /documents/:documentId/index` (Fase 2, índice semántico) se renombra a
`POST /documents/:documentId/index/semantic`, por simetría con el nuevo
`/index/lexical`. Es un cambio disruptivo menor sobre un endpoint que hoy solo consume
nuestra propia suite de tests — no hay clientes reales todavía (el frontend Angular es
Fase 7) — así que el costo de renombrar ahora es bajo y evita ambigüedad más adelante.

## Fuera de alcance (propuestas futuras)

- Fusión de resultados semánticos + léxicos (RRF) → `0005-hybrid-retrieval`. Los dos
  endpoints de debug (semántico y léxico) se retiran cuando esa fase esté lista.
- Exponer los parámetros de BM25 (`k1`, `b`) por variable de entorno → se evalúa en la
  Fase 8 (evaluación) si hace falta afinarlos con datos reales; hoy quedan como
  constantes, no configuración (ver `design.md` §6).

Ver `design.md` para las decisiones técnicas de esta fase, varias de ellas tomadas
explícitamente para no repetir problemas ya encontrados en la Fase 2 (idempotencia del
reindexado, tokenización consistente).