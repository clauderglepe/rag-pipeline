# Propuesta: Generación RAG con LLM local

## Por qué

Con el retrieval híbrido funcionando (Fase 4), el sistema puede encontrar los chunks
relevantes para una pregunta, pero todavía no puede *responderla* — esta es la última
pieza del pipeline RAG: tomar los chunks recuperados, construir un prompt con ellos como contexto, y pedirle a un LLM local (Ollama) que genere una respuesta en lenguaje natural, citando de dónde sale cada afirmación.

## Qué cambia

Se introducen **dos** capabilities, en dos módulos separados (coherente con el
diagrama de arquitectura del plan §2, que ya distinguía `GenerationModule` de
`QueryModule`):

### `rag-generation` (módulo `src/generation/`)

- `LlmProvider` (interfaz) + `OllamaLlmProvider`: llama a `POST /api/chat` (modelo
  `OLLAMA_GENERATION_MODEL`, nueva variable de entorno — `qwen2.5:7b-instruct` por
  defecto, ya decidido en ADR-0001), con `stream: false`.
- `buildPrompt()` (función pura): arma el array de `messages` — un mensaje `system` con instrucciones + el contexto recuperado, y un mensaje `user` con la pregunta tal cual (ver `design.md` §1 y §5 para el contenido exacto y sus riesgos conocidos).
- `GenerationService`: orquesta `buildPrompt()` + `LlmProvider.chat()`.

### `rag-query` (módulo `src/query/`)

- `QueryService`: llama a `RetrievalService.search()` (Fase 4) para obtener el contexto, se lo pasa a `GenerationService`, y arma la respuesta final con la respuesta del LLM y las fuentes usadas.
- Endpoint público `POST /documents/:documentId/query` — el endpoint final que consume el frontend Angular en la Fase 7.

## Fuera de alcance (propuestas futuras)

- Streaming de la respuesta al cliente (`stream: true` de Ollama, Server-Sent Events
  hacia el frontend) → se evalúa en la Fase 7 si la experiencia de usuario lo justifica; hoy responde de una sola vez.
- Memoria conversacional (preguntas de seguimiento con contexto de turnos anteriores) → explícitamente fuera de alcance del proyecto (ver plan §0, "qué NO vamos a construir").
- Mitigación de inyección de prompt vía contenido del documento → se documenta como
limitación conocida (`design.md` §5), no se implementa defensa activa en esta fase.

Ver `design.md` para el resto de las decisiones técnicas.