# Tareas — 0007-api-contract

Cada tarea marcada corresponde a un commit atómico (Conventional Commits entre paréntesis).

- [ ] Actualizar ADR-0001 §6: reemplazar la sección "pospuesta" por la decisión final (`class-validator`, con la justificación y lo encontrado sobre Nest v12 — copiar el contenido de `design.md` §1) 
      (`docs(adr): finalize dto validation decision`)
- [ ] Instalar `class-validator`, `class-transformer`, `@nestjs/swagger`
      (`chore: add validation and swagger dependencies`)
- [ ] Registrar `ValidationPipe` global en `main.ts` (`whitelist`, `forbidNonWhitelisted`,`transform`) 
      (`feat(api): add global validation pipe`)
- [ ] Convertir `HybridSearchQueryDto` (`retrieval`) a clase con `class-validator` + `@ApiProperty()`; borrar `parseHybridSearchQuery()` y su test; actualizar `RetrievalController` 
      (`refactor(retrieval): migrate query dto to class-validator`)
- [ ] Convertir `QueryRequestDto` (`query`) al mismo patrón; borrar `parseQueryRequest()` y su test; actualizar `QueryController`
      (`refactor(query): migrate query dto to class-validator`)
- [ ] Agregar `@ApiProperty()`/`@ApiPropertyOptional()` a todos los DTOs de respuesta existentes: `DocumentResponseDto`, `IndexResponseDto`, `LexicalIndexResponseDto`,`HybridSearchResultDto`, `QueryResponseDto`
      (`feat(api): annotate response dtos for swagger`)
- [ ] Implementar `AllExceptionsFilter` (`src/common/filters/`) + registrarlo global en `main.ts` + tests unitarios (mapeo de `HttpException` conocidas, y de un `Error` genérico no controlado, verificando que NO expone detalles internos)
      (`feat(api): add global exception filter`)
- [ ] Configurar `SwaggerModule` en `main.ts`, expuesto en `/api/docs`
      (`feat(api): add swagger documentation`)
- [ ] Anotar `POST /documents` (`IngestionController`) con `@ApiConsumes`/`@ApiBody` para que aparezca correctamente en Swagger pese a no tener DTO de clase
      (`feat(api): document file upload endpoint in swagger`)
- [ ] Test de integración: verificar que `GET /api/docs` responde `200`, y que un request con un DTO inválido (ej. `topK` como string no numérico, o una propiedad extra no declarada) responde `400` con el nuevo formato de error consistente
      (`test(api): add api contract integration test`)
- [ ] Actualizar `openspec/specs/api-contract/spec.md` como implementado
      (`docs(openspec): mark api-contract spec as implemented`)
- [ ] Actualizar checklist de Fase 6 en el README raíz, agregando el link a `/api/docs`
      (`docs: mark phase 6 as done`)

## Definición de "hecho"

- `npm run test` y `npm run test:e2e` pasan completos (todos los módulos).
- `GET /api/docs` sirve la UI de Swagger, con todos los endpoints documentados y ejemplos de request/response visibles.
- Cualquier request con un body inválido (tipo incorrecto, propiedad no declarada, campo faltante) responde `400` con la forma de error estandarizada de `design.md` §4.
- Ningún error `500` no controlado expone stack trace ni mensaje interno en la respuesta HTTP.
- El spec en `openspec/specs/` refleja el comportamiento real.

## Nota sobre el orden de las tareas

Las dos migraciones de DTOs (tareas 4 y 5) dependen de que el `ValidationPipe` global Ya esté registrado (tarea 3) — si se hacen en el orden inverso, los nuevos DTOs con decoradores no se validan todavía y los tests de esas tareas fallarían sin razón aparente. Respetar el orden del checklist acá no es arbitrario.