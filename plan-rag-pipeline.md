# Plan de Proyecto: Multi-Index RAG Pipeline (NestJS + Angular, 100% local)

> Objetivo de aprendizaje: entender un sistema RAG desde los fundamentos (parsing, chunking,
> embeddings, BM25, fusión híbrida, generación) construyéndolo pieza a pieza, con buenas
> prácticas de ingeniería y sin depender de una API de pago.

---

## 0. Alcance y objetivos

**Qué vamos a construir:**
Un backend en NestJS que ingiere un único PDF (un libro), lo indexa de dos formas distintas
(semántica con embeddings vectoriales, y léxica con BM25), combina ambos resultados (búsqueda
híbrida) y genera respuestas aumentadas con un LLM local. Un frontend en Angular consumirá esa
API para subir el libro, hacer preguntas y ver las fuentes citadas.

**Qué NO vamos a construir todavía** (YAGNI — lo dejamos para fases futuras explícitas, no
lo dejamos "abierto" en la arquitectura desde el día 1):
- Multi-documento real / multi-tenant.
- Reranking con cross-encoder.
- Autenticación/autorización.
- Escalado horizontal, colas, workers distribuidos.

Si el diseño de hoy necesita cambiar para soportar eso mañana, lo cambiaremos entonces. No
vamos a pagar complejidad hoy por una necesidad hipotética.

**Restricción dura:** cero llamadas a APIs de pago. Todo el cómputo de IA (embeddings + LLM)
corre en tu máquina.

---

## 1. Principios rectores del proyecto

1. **YAGNI primero.** Cada pieza se añade cuando el paso actual la necesita, no antes.
2. **Explicabilidad sobre "magia".** Preferimos implementar BM25 y la fusión híbrida
   nosotros mismos (son ~50-100 líneas cada una) en vez de esconderlas detrás de un
   framework, porque el objetivo es *aprender* RAG, no integrar una librería.
3. **Contratos antes que código.** Cada fase empieza con una especificación breve
   (OpenSpec) que describe qué construye, no cómo — el "cómo" se decide al implementar.
4. **Historial de Git legible.** Commits atómicos, Conventional Commits, una rama por
   unidad de trabajo.
5. **Todo local, reproducible.** Si algún día quieres mover esto a producción con Claude,
   solo cambias la capa de generación — el resto de la arquitectura no debería moverse.

---

## 2. Arquitectura general

```
┌─────────────────────────┐
│   Angular (frontend)    │
│  - Subir PDF            │
│  - Chat / buscador      │
│  - Ver fuentes citadas  │
└───────────┬──────────────┘
            │ HTTP/REST (OpenAPI)
┌───────────▼──────────────────────────────────────────────┐
│                     NestJS (backend)                      │
│                                                             │
│  IngestionModule        IndexModule            QueryModule │
│  ┌────────────────┐   ┌─────────────────┐   ┌────────────┐│
│  │ PDF → texto     │   │ Índice semántico │   │  Fusión    ││
│  │ texto → chunks  │──▶│ (embeddings)     │──▶│  híbrida   ││
│  │                 │   │ Índice léxico    │   │  (RRF)     ││
│  │                 │   │ (BM25)           │   │  + Prompt  ││
│  └────────────────┘   └─────────────────┘   │  + LLM     ││
│                                               └────────────┘│
└──────────┬───────────────────────┬────────────────────────┘
           │                       │
   ┌───────▼───────┐      ┌────────▼────────┐
   │  Ollama local  │      │  Vector/lexical  │
   │ (embeddings +  │      │  store (a decidir│
   │  LLM generación)│      │  contigo, ver §3)│
   └────────────────┘      └─────────────────┘
```

Tres módulos NestJS con responsabilidad única, cada uno detrás de una interfaz
(`EmbeddingProvider`, `VectorIndex`, `LexicalIndex`, `LlmProvider`) para que las decisiones
de la tabla de §3 se puedan cambiar sin tocar el resto del sistema — esto es lo único
"por si acaso" que sí vale la pena, porque es una interfaz, no una implementación extra.

---

## 3. Decisiones tecnológicas (con alternativas y justificación)

### 3.1 Extracción del PDF

| Opción | Descripción | Recomendación |
|---|---|---|
| **`pdf-parse`** | Librería Node pura, extrae texto plano rápido | ✅ Por defecto: simple, sin dependencias nativas |
| `pdfjs-dist` | El motor de Firefox para PDFs, más control (posición, capas) | Si el libro tiene layout complejo (columnas, tablas) |
| `unstructured` (Python) | Extracción muy robusta con estructura (títulos, listas) | Overkill para un libro de texto simple; añade un runtime Python |

**Justificación:** `pdf-parse` cubre el 90% del caso "libro con texto corrido". Si al probarlo
el resultado sale con ruido (headers/footers repetidos, saltos de página raros), migramos a
`pdfjs-dist` — pero no lo decidimos hoy sin evidencia.

### 3.2 Chunking

| Estrategia | Descripción |
|---|---|
| **Fixed-size con solapamiento** (ej. 500 tokens, overlap 50) | ✅ Por defecto: simple, predecible, fácil de razonar |
| Chunking semántico (por párrafo/sección, tamaño variable) | Mejor calidad de recuperación, pero requiere heurísticas de detección de secciones |
| Recursive character splitting (estilo LangChain) | Buen punto intermedio, respeta párrafos/oraciones antes de cortar |

**Justificación:** empezamos con fixed-size + overlap porque es trivial de implementar
(sin dependencias) y nos deja centrarnos en la parte de indexado. Es el primer punto que
revisaremos con datos reales una vez tengamos el pipeline de evaluación (Fase 8).

### 3.3 Embeddings (índice semántico)

| Opción | Cómo corre | Pros | Contras |
|---|---|---|---|
| **Ollama** (`nomic-embed-text`, `mxbai-embed-large`) | Servicio local aparte, HTTP API | Un solo binario para embeddings *y* generación (§3.7); modelos de buena calidad | Requiere instalar y tener corriendo el servicio Ollama |
| `transformers.js` (Xenova) | In-process, dentro del propio Node | Cero infraestructura externa, todo vive en el repo | Modelos algo más limitados; primera carga descarga pesos (~90MB) |

**Recomendación por defecto: Ollama**, porque así usamos **un único runtime** tanto para
embeddings como para generación (§3.7), lo cual simplifica el proyecto. Si prefieres no
instalar/correr un servicio aparte, `transformers.js` es la alternativa "cero infra" —
te pregunto tu preferencia al final de este documento.

### 3.4 Vector store (dónde viven los embeddings)

| Opción | Infraestructura | Cuándo tiene sentido |
|---|---|---|
| **Búsqueda por fuerza bruta en memoria** (cosine similarity manual) | Ninguna | ✅ Por defecto para un solo libro: unos pocos miles de chunks, la búsqueda exhaustiva tarda milisegundos, y **la implementas tú mismo** — es la forma más directa de entender qué es realmente un vector store |
| `hnswlib-node` | Ninguna (librería embebida) | Cuando quieras aprender indexación aproximada (HNSW) sin montar un servidor |
| `pgvector` (Postgres) | Requiere Postgres (Docker o instalado) | Cuando pasemos a multi-documento/producción — es el estándar de facto en RAGs reales |
| Qdrant / Weaviate | Requiere Docker | Si quieres explorar filtros por metadata avanzados; para este alcance es más infraestructura de la que necesitamos |

**Justificación:** para *un* libro, una búsqueda exhaustiva en memoria no tiene cuello de
botella de rendimiento real, y programar el cálculo de similitud coseno a mano es
pedagógicamente el paso más valioso de todo el proyecto. `pgvector` queda anotado como el
paso natural cuando extendamos a multi-documento (Fase 9, futura).

### 3.5 Índice léxico (BM25)

| Opción | Descripción |
|---|---|
| **Implementación propia de BM25** | ✅ Por defecto: el algoritmo es ~80 líneas (tokenizar, IDF, TF normalizado por longitud). Entenderás exactamente qué compara con la búsqueda semántica |
| `okapibm25` (npm) | Ya implementado, útil si quieres saltarte la parte matemática |
| OpenSearch/Elasticsearch | BM25 "de verdad", pero es un servidor entero para indexar un libro — desproporcionado aquí |

**Justificación:** igual que con el vector store, implementar BM25 a mano es exactamente el
tipo de "aprender desde el inicio" que pediste, y a esta escala no hay razón de rendimiento
para no hacerlo.

### 3.6 Fusión híbrida (combinar semántico + léxico)

**Reciprocal Rank Fusion (RRF)**: para cada chunk, `score = Σ 1 / (k + rank_en_cada_lista)`
(k≈60 es el valor típico en la literatura). No hace falta normalizar scores de escalas
distintas (coseno vs BM25), que es el problema habitual al combinar ambos mundos — por eso
es el método estándar en sistemas híbridos (Weaviate, Elastic, y el propio blog de
"Contextual Retrieval" de Anthropic lo usan). Alternativa (normalizar y sumar con pesos
manuales) es más frágil y añade un hiperparámetro a ajustar sin necesidad.

### 3.7 Generación (LLM local)

| Opción | Pros | Contras |
|---|---|---|
| **Ollama** (`llama3.1:8b-instruct`, `qwen2.5:7b-instruct`, `phi3`, según tu hardware) | API HTTP trivial desde NestJS, gestiona descarga/cuantización de modelos | Servicio externo a correr |
| `node-llama-cpp` | Todo in-process, sin servicio aparte | Compilación nativa más pesada de configurar |

**Recomendación: Ollama**, coherente con la elección de §3.3 (mismo runtime para embeddings
y generación).

### 3.8 Backend — estructura modular NestJS

- `IngestionModule`: upload de PDF, extracción, chunking.
- `IndexModule`: `EmbeddingProvider` (interfaz) + `VectorIndex` (interfaz) + `LexicalIndex`.
- `RetrievalModule`: fusión RRF + construcción del contexto.
- `GenerationModule`: `LlmProvider` (interfaz) + construcción de prompt + llamada a Ollama.
- `QueryModule` (o `ChatModule`): orquesta retrieval + generation, expone el endpoint público.

Cada `Provider` es una interfaz TypeScript con **una** implementación real hoy — no
añadimos factories/strategies genéricas hasta que exista una segunda implementación real
que las necesite.

### 3.9 Frontend Angular

Standalone components (no NgModules, es el enfoque moderno recomendado), signals para
estado reactivo, un servicio `RagApiService` fino que envuelve las llamadas HTTP tipadas
contra el contrato OpenAPI del backend.

---

## 4. Metodología de especificación: OpenSpec

[OpenSpec](https://github.com/Fission-AI/OpenSpec) es un framework ligero de *spec-driven
development*: antes de programar, se escribe una propuesta (`proposal.md`) y una
especificación (`specs/*.md`) que capturan **qué** se va a construir; luego se genera una
lista de tareas y se implementa contra eso. Su estructura de carpetas:

```
openspec/
  specs/     ← "fuente de verdad" del sistema tal como es hoy
  changes/   ← propuestas de cambio en curso (proposal, design, tasks)
```

**Importante para nuestro contexto:** OpenSpec está pensado para agentes de código con
comandos slash (Claude Code, Cursor, etc.). En esta conversación de chat no tengo acceso a
su CLI. Dos formas de aprovecharlo igualmente:

1. **Adoptamos su estructura de carpetas y filosofía manualmente**: yo te redacto cada
   `proposal.md`/`spec.md` en Markdown siguiendo su formato, las guardamos en el repo, y
   avanzamos fase a fase igual que haría el flujo `/opsx:propose → /opsx:apply`. Sin
   instalar nada.
2. **Usas el CLI real** (`npx openspec init`) si en algún momento continúas este proyecto
   con Claude Code u otro asistente compatible — las specs que redactemos aquí serán
   compatibles con ese flujo sin cambios.

Alternativa descartada: **GitHub Spec Kit** — más completo pero, según su propia
comparación, "heavyweight, rigid phase gates, requiere Python" — desproporcionado para un
proyecto de aprendizaje en solitario.

---

## 5. Flujo de Git

- **Ramas de corta vida por unidad de trabajo**, no por fase completa: `feat/pdf-ingestion`,
  `feat/bm25-index`, `feat/hybrid-retrieval`, etc. Cuando termina la tarea, se mergea a
  `main` y se borra.
- **Conventional Commits** en cada commit atómico:
  - `feat(ingestion): extract text from uploaded PDF`
  - `test(bm25): add scoring unit tests`
  - `docs(adr): record vector store decision`
  - `refactor(index): extract EmbeddingProvider interface`
- **Un commit = un cambio lógico revisable**, no "WIP" gigantes. Si una tarea mezcla
  código + tests + docs, van en commits separados en ese orden.
- **PRs auto-revisados** aunque trabajes solo: obliga a releer el diff antes de mergear,
  y dejas registro de *por qué*, no solo *qué*, en la descripción del PR.
- Etiquetamos (`git tag`) el final de cada fase del roadmap (§8) como punto de referencia.

---

## 6. Documentación

| Herramienta | Para qué |
|---|---|
| `@nestjs/swagger` | Genera OpenAPI + Swagger UI (`/api/docs`) directamente desde los DTOs y decoradores — el contrato que consumirá Angular |
| **ADRs** (Architecture Decision Records, formato MADR) en `docs/adr/` | Un archivo corto por decisión importante (ej. `0001-vector-store-brute-force.md`): contexto, opciones consideradas, decisión, consecuencias. Es la versión "para siempre" de las tablas de la §3 |
| `openspec/specs/` | Qué hace el sistema, vivo y actualizado |
| README por módulo | Cómo correr, variables de entorno, cómo probar |

Compodoc queda como opción si más adelante quieres documentación navegable auto-generada
del grafo de dependencias de NestJS/Angular — no es necesario para empezar.

---

## 7. Estrategia de testing

- **Unit tests (Jest)**: BM25 (casos con corpus pequeño y resultado esperado a mano),
  chunking (offsets correctos, overlap correcto), fusión RRF (orden esperado con rankings
  conocidos).
- **Tests de integración**: el pipeline completo ingestion → index → query contra un PDF
  de prueba pequeño (fixture de 2-3 páginas), sin mockear Ollama (test real pero acotado)
  o con un `LlmProvider`/`EmbeddingProvider` fake para tests rápidos y deterministas.
- **Evaluación de recuperación** (no es "testing" clásico, es específico de RAG): un
  set pequeño de preguntas sobre el libro con la página/sección donde está la respuesta,
  para medir recall@k del retrieval — esto se construye en la Fase 8, cuando ya haya
  contenido real que evaluar.

---

## 8. Roadmap por fases

Cada fase = una spec en `openspec/changes/`, una o varias ramas, PR, merge, tag.

| Fase | Entregable | Depende de |
|---|---|---|
| **0. Bootstrap** | Repo, esqueleto NestJS, `openspec/` inicial, ADR-0001 (decisiones de esta doc), README | — |
| **1. Ingesta** | Endpoint para subir el PDF, extracción de texto, chunking con metadata (página, offset) | Fase 0 |
| **2. Índice semántico** | Embeddings vía Ollama, almacenamiento y búsqueda por similitud coseno en memoria | Fase 1 |
| **3. Índice léxico** | BM25 propio sobre los mismos chunks | Fase 1 (paralelizable con Fase 2) |
| **4. Retrieval híbrido** | Fusión RRF de ambos índices, endpoint interno de búsqueda | Fases 2 y 3 |
| **5. Generación RAG** | Prompt con contexto recuperado + llamada a Ollama, endpoint `/query` público | Fase 4 |
| **6. Contrato API** | Swagger/OpenAPI completo, DTOs validados, manejo de errores | Fase 5 |
| **7. Frontend Angular** | Subida de PDF, caja de pregunta/respuesta, fuentes citadas con link a la página | Fase 6 |
| **8. Evaluación** | Golden set de preguntas, métricas recall@k/MRR, ajuste de chunking si hace falta | Fase 7 |
| *9. Futuro (fuera de alcance ahora)* | Multi-documento, pgvector, reranking, auth | — |

---

## 9. Estructura de carpetas propuesta

```
rag-pipeline/
├── openspec/
│   ├── specs/
│   └── changes/
├── docs/
│   └── adr/
├── apps/
│   ├── api/                  ← NestJS
│   │   └── src/
│   │       ├── ingestion/
│   │       ├── index/
│   │       │   ├── embedding/     (interfaz + impl Ollama)
│   │       │   ├── vector-store/  (interfaz + impl brute-force)
│   │       │   └── lexical/       (BM25 propio)
│   │       ├── retrieval/         (fusión RRF)
│   │       ├── generation/        (interfaz + impl Ollama)
│   │       └── query/             (orquestación, endpoint público)
│   └── web/                  ← Angular
├── docker-compose.yml        ← (si aplica según tus respuestas)
└── README.md
```

---

## 10. Antes de empezar: necesito confirmar 3 decisiones contigo

Las decisiones de la §3 tienen un default recomendado, pero dependen de tu entorno. Te las
pregunto abajo en formato de opciones:
- ¿Cómo quieres correr los modelos de IA (embeddings y generación)?
* No lo tengo claro, recomiéndamelo tú
- ¿Puedes usar Docker en tu máquina para este proyecto?
* Sí, tengo Docker disponible
- Para las specs, ¿cómo trabajamos con OpenSpec?
* Estructura manual, solo en chat