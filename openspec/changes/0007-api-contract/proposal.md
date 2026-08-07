# Propuesta: Contrato de API (Swagger, DTOs validados, manejo de errores)

## Por qué

El backend ya tiene todos sus endpoints funcionales (ingesta, indexado semántico y léxico, retrieval híbrido, generación RAG), pero cada uno valida sus DTOs a mano (decisión deliberadamente pospuesta desde la Fase 2, ADR-0001 §6) y no hay documentación de API navegable. Esta fase cierra ambas cosas antes de construir el frontend Angular (Fase 7), que va a consumir este contrato.

## Qué cambia

Se introduce la capability **`api-contract`**, sin un módulo nuevo — modifica los módulos existentes:

- **Decisión final de validación (cierra ADR-0001 §6):** `class-validator` + `class-transformer`, con `ValidationPipe` global. Ver `design.md` §1 para la justificación completa, incluyendo lo encontrado sobre NestJS v12 / Standard Schema.
- Los DTOs de petición que hoy se validan a mano (`HybridSearchQueryDto` en `retrieval`, `QueryRequestDto` en `query`) se convierten a clases con decoradores de `class-validator`.
- Todos los DTOs de respuesta existentes (`DocumentResponseDto`, `IndexResponseDto`, `LexicalIndexResponseDto`, `HybridSearchResultDto`, `QueryResponseDto`) reciben decoradores `@ApiProperty()` de `@nestjs/swagger` para que aparezcan correctamente documentados.
- `@nestjs/swagger` configurado con `SwaggerModule`, expuesto en `/api/docs`.
- Filtro de excepciones global (`AllExceptionsFilter`) que estandariza la forma de **todas** las respuestas de error (ver `design.md` §4) — hoy cada excepción de Nest devuelve su forma default, sin un contrato consistente documentado.

## Qué NO cambia

- El endpoint de subida de PDF (`POST /documents`) sigue usando `FileInterceptor` + `ParseFilePipe` (Fase 1) — no es un DTO de body JSON, se documenta en Swagger con `@ApiConsumes('multipart/form-data')` y `@ApiBody` con schema binario, sin tocar su lógica de validación de archivo.
- Ningún endpoint cambia de comportamiento funcional — esta fase es documentación y consistencia de contrato, no funcionalidad nueva.

## Fuera de alcance

- Autenticación/autorización (fuera de alcance del proyecto completo, ver plan §0).
- Versionado de API (`/v1/...`) — se evalúa si hace falta al llegar a una fase de producción real, no antes.

Ver `design.md` para el resto de las decisiones técnicas.