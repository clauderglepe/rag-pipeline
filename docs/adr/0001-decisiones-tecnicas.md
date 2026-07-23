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

**Decisión explícitamente pospuesta:** qué librería de validación usar para los DTOs de
los endpoints HTTP (Fase 6, junto con la generación de Swagger) **no** se decide ahora.
Validar variables de entorno y validar cuerpos de petición HTTP son problemas distintos
que no comparten schemas — no hay necesidad de resolver ambos con la misma herramienta
solo por consistencia.

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