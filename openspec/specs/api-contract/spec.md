# Capability: api-contract

> Estado: implementado (`changes/0007-api-contract`).

## Requirement: Documentación OpenAPI navegable

El sistema DEBE exponer documentación interactiva de todos sus endpoints públicos.

### Scenario: Acceso a la documentación
- **GIVEN** el backend corriendo
- **WHEN** se accede a `GET /api/docs`
- **THEN** se sirve una interfaz Swagger UI con todos los endpoints, sus DTOs de petición y respuesta, y ejemplos

## Requirement: Validación consistente de DTOs de petición

Todo endpoint que reciba un body JSON DEBE validarlo mediante `class-validator`, vía un `ValidationPipe` global — no validación manual ad-hoc por endpoint.

### Scenario: Propiedad no declarada
- **GIVEN** una petición a cualquier endpoint con un campo extra no declarado en su DTO
- **WHEN** se procesa la petición
- **THEN** el sistema responde `400 Bad Request`, rechazando la petición completa (no la acepta ignorando el campo extra en silencio)

### Scenario: Tipo incorrecto con transformación esperada
- **GIVEN** una petición donde un campo numérico llega como string transformable (ej. querystring)
- **WHEN** se procesa la petición
- **THEN** el `ValidationPipe` lo transforma al tipo declarado antes de llegar al controller

## Requirement: Forma de error consistente

Toda respuesta de error (validación, no encontrado, servicio no disponible, error interno) DEBE tener la misma forma: `{ statusCode, message, error, timestamp, path }`.

### Scenario: Error de validación vs. error de negocio
- **GIVEN** un error `400` de validación de DTO y un error `404` de documento no encontrado
- **WHEN** se comparan ambas respuestas
- **THEN** ambas tienen exactamente los mismos campos en su body, solo con valores distintos

### Scenario: Error interno no expone detalles
- **GIVEN** un error no controlado (`500`) en el servidor
- **WHEN** se recibe la respuesta HTTP
- **THEN** el body NO contiene el stack trace ni el mensaje interno original del error, solo un mensaje genérico

## Requirement: Endpoint de subida de archivo documentado pese a no usar DTO de clase

`POST /documents` DEBE aparecer correctamente documentado en Swagger (tipo `multipart/form-data`, campo `file` binario) aunque no use una clase DTO validada por `class-validator`.

### Scenario: Documentación del endpoint de subida
- **GIVEN** la documentación de `/api/docs`
- **WHEN** se inspecciona el endpoint `POST /documents`
- **THEN** muestra que espera `multipart/form-data` con un campo `file` de tipo binario