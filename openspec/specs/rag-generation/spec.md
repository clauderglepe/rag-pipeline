# Capability: rag-generation

> Estado: propuesto (se implementa en `changes/0006-rag-generation`). Este archivo se actualiza a "implementado" cuando la última tarea de `tasks.md` se complete.

## Requirement: Generación de respuesta a partir de contexto recuperado

El sistema DEBE poder construir un prompt a partir de una pregunta y una lista de chunks de contexto, y obtener una respuesta en lenguaje natural de un LLM local.

### Scenario: Generación exitosa con contexto
- **GIVEN** una pregunta y una lista no vacía de chunks de contexto (con su página)
- **WHEN** se construye el prompt y se llama al LLM
- **THEN** se obtiene una respuesta en texto no vacía

### Scenario: Ollama no disponible para generación
- **GIVEN** el servicio de Ollama no está corriendo o el modelo de generación configurado no está descargado
- **WHEN** se intenta generar una respuesta
- **THEN** el sistema responde `503 Service Unavailable` con un mensaje que indica
  revisar que Ollama esté corriendo y el modelo descargado

## Requirement: El prompt instruye a no inventar información

El mensaje de sistema del prompt DEBE instruir al modelo a responder exclusivamente en base al contexto dado, y a indicar explícitamente cuando el contexto no alcanza para responder.

### Scenario: Contenido del prompt
- **GIVEN** una pregunta y chunks de contexto
- **WHEN** se construye el prompt
- **THEN** el mensaje `system` incluye instrucciones explícitas de no inventar   información fuera del contexto, y de citar la página de origen de cada afirmación

## Requirement: La pregunta del usuario no se modifica

El mensaje `user` del prompt DEBE contener la pregunta tal cual la escribió la persona, sin reformularla ni agregarle texto adicional.

### Scenario: Pregunta preservada
- **GIVEN** una pregunta con un texto específico
- **WHEN** se construye el prompt
- **THEN** el mensaje `user` es exactamente ese texto, sin modificaciones