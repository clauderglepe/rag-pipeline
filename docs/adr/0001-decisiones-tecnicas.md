# ADR-0001: Decisiones técnicas iniciales del RAG multi-índice

- **Estado:** Aceptado
- **Fecha:** 2026-07-20

## Contexto

Construimos un RAG sobre un único PDF (un libro), 100% local (sin APIs de pago), como
proyecto de aprendizaje. El análisis completo de alternativas está en
`plan-rag-pipeline.md`. Este ADR fija las decisiones confirmadas para arrancar la Fase 0.

## Decisiones

### 1. Runtime de IA: Ollama, en Docker

**Decisión:** Ollama corre como servicio en `docker-compose.yml`, y se usa para **ambas**
cosas:
- Embeddings: `nomic-embed-text` (modelo pequeño, ~275MB, buena calidad para RAG).
- Generación: `qwen2.5:7b-instruct` como default (buen equilibrio calidad/tamaño para CPU;
  si tu máquina tiene poca RAM, cambiamos a `phi3` o `llama3.2:3b-instruct` sin tocar código,
  solo el nombre del modelo en la config).

**Por qué:** un único runtime para ambas necesidades reduce la superficie de
infraestructura a una sola pieza. Con Docker disponible, Ollama se levanta con
`docker compose up` sin instalación manual en el host, y es reproducible para cualquiera
que clone el repo.

**Alternativa descartada:** `transformers.js` in-process. Se descarta por ahora porque
mezclar dos runtimes (uno para embeddings en Node, otro para generación) añade más
piezas que un solo servicio Ollama. Queda anotado como opción si en el futuro se quiere
eliminar la dependencia de Docker.

### 2. Vector store: fuerza bruta en memoria

Sin cambios respecto al plan: para un solo libro, cosine similarity exhaustiva
implementada a mano. Sin servicio externo.

### 3. Índice léxico: BM25 propio

Sin cambios respecto al plan.

### 4. Especificaciones: estructura OpenSpec manual

**Decisión:** adoptamos la estructura de carpetas de OpenSpec (`openspec/specs/`,
`openspec/changes/`) y el formato de sus documentos (`proposal.md`, `tasks.md`,
`design.md`), redactados a mano en esta conversación — sin instalar su CLI. Si en el
futuro continúas el proyecto con Claude Code, la carpeta `openspec/` ya es compatible con
su flujo `/opsx:*` sin migración.

### 5. Docker disponible

Se usa `docker-compose.yml` para Ollama desde ya. Postgres/pgvector queda fuera de alcance
(ver plan, Fase 9 futura) — no se añade "porque ya tenemos Docker", solo cuando haya una
necesidad real de multi-documento.

### 6. Validación de configuración: Zod para variables de entorno; DTOs de HTTP, decisión pospuesta

**Decisión:** las variables de entorno (`OLLAMA_BASE_URL`, `OLLAMA_EMBEDDING_MODEL`,
`EMBEDDING_BATCH_SIZE`, etc.) se validan con `zod` (`schema.safeParse`), sin librerías
puente adicionales.

**Por qué:** para este caso concreto, Zod evita la ceremonia de `plainToInstance` +
`validateSync` que requeriría `class-validator`, y el tipo TypeScript se infiere
directamente del schema (`z.infer`) — una sola fuente de verdad.

**Decisión:** `class-validator` + `class-transformer`, con `ValidationPipe` global para validación de DTOs y generación de documentación con Swagger.

*Lo que se encontró al llegar a esta fase:**
- NestJS v12 (PR #16391) trae soporte nativo de Standard Schema en decoradores de ruta (`@Body`, `@Query`, etc.), compatible con Zod — en preview desde junio 2026, estable previsto para inicios de Q3 2026.
- **Sin resolver ni siquiera en la propia discusión del PR:** cómo generar el schema de Swagger a partir de DTOs inferidos de Zod. Un colaborador externo hizo esa pregunta exacta en el PR sin respuesta concluyente al momento de esta decisión.
- La documentación oficial de Nest va a seguir recomendando `class-validator` como default para la mayoría de casos de uso, según cobertura de Trilon Consulting sobre el release.

**Por qué, concretamente:** el objetivo explícito de esta fase es Swagger/OpenAPI completo — no solo validación. `class-validator` + `@nestjs/swagger` es la integración nativa, sin piezas puente, sin preguntas abiertas. Zod con Standard Schema resuelve la mitad del problema (validación) pero no la otra mitad (documentación autogenerada), que es precisamente lo que esta fase necesita resuelto de punta a punta. Si en el futuro madura la integración Zod-Swagger, se revisa — no antes, y no a costa de bloquear esta fase con una pieza todavía experimental.

**Consecuencia:** las variables de entorno (`env.validation.ts`) siguen usando Zod — esa decisión (Fase 2) no cambia, porque nunca dependió de Swagger. Solo los DTOs de HTTP adoptan `class-validator`, manteniendo dos herramientas para dos problemas distintos, tal como se dejó explícito en la decisión original.

Al llegar a la Fase 6, revisar el estado de
[nestjs/nest#14539](https://github.com/nestjs/nest/issues/14539) (soporte nativo de
Nest para Standard Schema, con el que Zod podría validar DTOs sin librerías puente como
`nestjs-zod`) antes de decidir entre Zod y `class-validator` para esa fase. Si para
entonces Nest v12 ya soporta Standard Schema de forma nativa, es un argumento fuerte a
favor de Zod también ahí; si no, `class-validator` sigue siendo el camino sin
dependencias puente adicionales.

## Consecuencias

- Requisito de entorno: Docker + Docker Compose instalados; primera vez que se levante el
  stack, hay que descargar los modelos de Ollama (`ollama pull nomic-embed-text`,
  `ollama pull qwen2.5:7b-instruct`), lo cual puede tardar varios minutos según conexión.
- Si tu hardware no soporta bien `qwen2.5:7b-instruct` (poca RAM/CPU lenta), el cambio a un
  modelo más pequeño es de una sola línea de configuración, no de código.