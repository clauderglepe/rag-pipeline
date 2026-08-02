# Design — 0006-rag-generation

## 1. `/api/chat`, no `/api/generate`

**Decisión:** `OllamaLlmProvider.chat()` llama a `POST /api/chat` con un array de
`messages` (`{ role: 'system' | 'user' | 'assistant', content: string }`) y
`stream: false`.

**Por qué:** `/api/generate` es de un solo turno y un solo bloque de texto — no separa "instrucciones del sistema" de "pregunta del usuario", que es exactamente la separación que necesitamos para que el contexto recuperado y las reglas de comportamiento (citar páginas, no inventar) vivan en un mensaje `system` distinto de la pregunta real del usuario. `/api/chat` es además el formato que los modelos instruct (como `qwen2.5:7b-instruct`) esperan nativamente, por su plantilla de entrenamiento.

## 2. Nueva variable de entorno: `OLLAMA_GENERATION_MODEL`

Se agrega al schema de Zod (`env.validation.ts`, Fase 2) junto a las ya existentes.
Default sugerido en `.env.example`: `qwen2.5:7b-instruct` (ADR-0001). Mismo criterio que `OLLAMA_EMBEDDING_MODEL`: varía según el hardware de quien corra el proyecto, así que es configuración de entorno, no una constante en código.

## 3. Contexto: tamaño fijo, no configurable por el cliente todavía

**Decisión:** `QueryService` siempre pide `CONTEXT_TOP_K = 5` chunks a `RetrievalService.search()` — no es un parámetro que el cliente de la API pueda variar en esta fase (a diferencia de `topK` en el endpoint de búsqueda de la Fase 4).

**Por qué:** más contexto no es gratis — cada chunk agregado alarga el prompt, lo cual cuesta tiempo de inferencia y puede diluir la atención del modelo con contenido menos relevante (discutido ya de forma conversacional al explicar `topK` en la Fase 2). Fijar un valor razonable ahora y revisarlo con datos reales en la Fase 8 (evaluación) es preferible a exponer un parámetro que un cliente podría subir sin entender el trade-off.

## 4. Documento sin contexto indexado: no se llama al LLM

**Decisión:** si `RetrievalService.search()` devuelve una lista vacía (documento
ingerido pero no indexado en ningún índice todavía — comportamiento ya definido en las Fases 2 y 3), `QueryService` devuelve una respuesta fija sin invocar a Ollama:

```
"No hay contenido indexado para este documento todavía. Indexalo con POST /documents/:id/index/semantic y/o /index/lexical antes de preguntar."
```

**Por qué:** pedirle al LLM que "diga que no sabe" cuando ya sabemos, de antemano, que no hay contexto es gastar una llamada de inferencia (la parte más lenta y costosa del pipeline) para un resultado que podemos determinar sin él. Es una optimización simple y además da un mensaje más específico y accionable que lo que el modelo probablemente generaría genéricamente.

## 5. Contenido del prompt, y una limitación conocida (no resuelta en esta fase)

**Prompt del mensaje `system`** (texto exacto, se ajusta en la tarea de implementación si las respuestas reales lo requieren):

```
Eres un asistente que responde preguntas basándote EXCLUSIVAMENTE en el siguiente
contexto extraído de un documento. Si el contexto no contiene información suficiente
para responder, dilo explícitamente — no inventes ni completes con conocimiento
propio. Cuando una afirmación provenga de una parte específica del contexto, cita la
página entre paréntesis, por ejemplo (p. 12). Responde en el mismo idioma en el que
está escrita la pregunta.

Contexto:
[p. {page}] {text}

[p. {page}] {text}
...
```

El mensaje `user` es la pregunta tal cual la escribió la persona, sin modificar.

**Limitación conocida, documentada y no resuelta aquí:** el contenido de `{text}` viene del PDF que el usuario subió — en principio, texto dentro del documento podría contener instrucciones que intenten alterar el comportamiento del modelo (inyección de prompt vía contenido recuperado, un problema conocido en sistemas RAG reales). Para este proyecto de aprendizaje, con un único documento que el propio usuario elige y sube, el riesgo real es bajo — pero se documenta la limitación en vez de ignorarla, porque en un sistema con documentos de terceros sí sería una preocupación seria a mitigar (instrucciones explícitas más fuertes, sanitización de contenido, modelos con mejor separación de instrucción/dato). Fuera de alcance implementar una defensa activa ahora.

## 6. Manejo de errores de `OllamaLlmProvider`

Mismo patrón que `OllamaEmbeddingProvider` (Fase 2): fallo de conexión o de modelo no
descargado → `ServiceUnavailableException` con mensaje explícito señalando `docker compose up -d` / `ollama pull`. No se duplica lógica nueva, se replica el patrón ya validado.

## 7. Estructura de módulos NestJS

```
apps/api/src/generation/
  generation.module.ts
  generation.service.ts             (buildPrompt + llamada a LlmProvider)
  prompt-builder.ts                 (función pura)
  llm-provider.interface.ts
  ollama-llm.provider.ts

apps/api/src/query/
  query.module.ts
  query.controller.ts               (POST /documents/:id/query)
  query.service.ts                  (orquesta RetrievalService + GenerationService)
  dto/query-request.dto.ts          (validación manual — ver nota abajo)
  dto/query-response.dto.ts
```

**Sobre la validación del DTO de este endpoint:** sigue pospuesta a la Fase 6 (ADR-0001 §6), mismo criterio que en las Fases 2, 3 y 4 — aunque este es el endpoint
"final" y más visible del backend, no cambia esa decisión ya tomada explícitamente.