# Propuesta: Bootstrap del RAG multi-índice

## Por qué
Necesitamos una base de proyecto (repo, servicio de modelos locales, estructura de
carpetas) antes de implementar ingestión, indexado y recuperación.

## Qué cambia
- Estructura de carpetas del monorepo (apps/api, futuro apps/web).
- Servicio Ollama disponible localmente vía Docker.
- Documentación base (plan, ADR-0001).

## Fuera de alcance
Cualquier lógica de ingestión, indexado o generación — eso son propuestas futuras
(0002-ingestion, 0003-indices, ...).