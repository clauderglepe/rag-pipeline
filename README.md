# RAG Pipeline — NestJS + Angular (100% local)

Sistema RAG (Retrieval-Augmented Generation) construido como proyecto de aprendizaje:
indexa un libro en PDF con dos motores de búsqueda (semántico por embeddings y léxico
por BM25), los combina con fusión híbrida (RRF) y genera respuestas con un LLM local vía
Ollama. Backend en NestJS, frontend en Angular. Cero dependencias de APIs de pago.

Documentación de referencia:
- [`plan-rag-pipeline.md`](./plan-rag-pipeline.md) — arquitectura completa y justificación
  de cada decisión técnica, con alternativas consideradas.
- [`docs/adr/`](./docs/adr/) — Architecture Decision Records (decisiones fijadas).
- [`openspec/specs/`](./openspec/specs/) — especificación del sistema tal como es hoy.
- [`openspec/changes/`](./openspec/changes/) — propuestas de cambio en curso/históricas.

## Requisitos

- Node.js 20+
- Docker y Docker Compose
- ~8GB RAM libres recomendados (para el modelo de generación por defecto)

## Arrancar el entorno

1. Levantar Ollama y descargar los modelos (solo la primera vez lo de `pull`):

   ```bash
   docker compose up -d
   docker compose exec ollama ollama pull nomic-embed-text
   docker compose exec ollama ollama pull qwen2.5:7b-instruct
   ```

   Verificar:

   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Configurar variables de entorno del backend (una sola vez):

   ```bash
   cd apps/api
   cp .env.example .env
   ```

3. Instalar dependencias y arrancar el backend:

   ```bash
   npm install
   npm run start:dev
   ```

   La API queda disponible en `http://localhost:3000`. La documentación OpenAPI
   (Swagger) se añade en la Fase 6 del roadmap, en `/api/docs`.

4. Frontend Angular (`apps/web`): se añade en la Fase 7 del roadmap — todavía no existe.

## Estado del proyecto

Ver el roadmap por fases en `plan-rag-pipeline.md`, sección 8.

- [x] Fase 0 — Bootstrap
- [x] Fase 1 — Ingesta del PDF
- [x] Fase 2 — Índice semántico
- [ ] Fase 3 — Índice léxico (BM25) (en curso)
- [ ] Fase 4 — Retrieval híbrido
- [ ] Fase 5 — Generación RAG
- [ ] Fase 6 — Contrato API (Swagger)
- [ ] Fase 7 — Frontend Angular
- [ ] Fase 8 — Evaluación

## Convenciones de contribución

- Ramas de corta vida por unidad de trabajo: `feat/...`, `fix/...`, `docs/...`, `chore/...`
- [Conventional Commits](https://www.conventionalcommits.org/) en cada commit, atómico
  (un cambio lógico por commit).
- Cada fase del roadmap arranca con una propuesta en `openspec/changes/` antes de
  escribir código.