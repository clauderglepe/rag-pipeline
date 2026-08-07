# Design — 0007-api-contract

## 1. Decisión final (cierra ADR-0001 §6): `class-validator`, no Zod

**Contexto de la decisión pospuesta:** desde la Fase 2, ADR-0001 §6 pospuso explícitamente esta elección, con la instrucción de revisar el estado de `nestjs/nest#14539` (soporte nativo de Standard Schema en Nest) antes de decidir.

**Lo que se encontró al llegar a esta fase:**
- NestJS v12 (PR #16391) trae soporte nativo de Standard Schema en decoradores de ruta (`@Body`, `@Query`, etc.), compatible con Zod — en preview desde junio 2026, estable previsto para inicios de Q3 2026.
- **Sin resolver ni siquiera en la propia discusión del PR:** cómo generar el schema de Swagger a partir de DTOs inferidos de Zod. Un colaborador externo hizo esa pregunta exacta en el PR sin respuesta concluyente al momento de esta decisión.
- La documentación oficial de Nest va a seguir recomendando `class-validator` como default para la mayoría de casos de uso, según cobertura de Trilon Consulting sobre el release.

**Decisión:** `class-validator` + `class-transformer`, con `ValidationPipe` global.

**Por qué, concretamente:** el objetivo explícito de esta fase es Swagger/OpenAPI completo — no solo validación. `class-validator` + `@nestjs/swagger` es la integración nativa, sin piezas puente, sin preguntas abiertas. Zod con Standard Schema resuelve la mitad del problema (validación) pero no la otra mitad (documentación autogenerada), que es precisamente lo que esta fase necesita resuelto de punta a punta. Si en el futuro madura la integración Zod-Swagger, se revisa — no antes, y no a costa de bloquear esta fase con una pieza todavía experimental.

**Consecuencia:** las variables de entorno (`env.validation.ts`) siguen usando Zod — esa decisión (Fase 2) no cambia, porque nunca dependió de Swagger. Solo los DTOs de HTTP adoptan `class-validator`, manteniendo dos herramientas para dos problemas distintos, tal como se dejó explícito en la decisión original.

## 2. `ValidationPipe` global, con `transform: true`

```typescript
// src/main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // descarta propiedades no declaradas en el DTO
    forbidNonWhitelisted: true, // rechaza la petición si trae propiedades extra, en vez de solo ignorarlas
    transform: true, // convierte tipos primitivos (ej. querystring "5" -> number 5)
  }),
)
```

**Por qué `forbidNonWhitelisted` y no solo `whitelist`:** silenciar propiedades extra sin avisar puede esconder errores del cliente (un typo en un nombre de campo se ignoraría en vez de fallar visiblemente). Rechazar explícitamente es más honesto para quien consume la API — incluido el futuro frontend Angular.

## 3. Migración de los DTOs manuales existentes

| DTO manual (a reemplazar) | Nuevo DTO con `class-validator` |
|---|---|
| `parseHybridSearchQuery()` (`retrieval/dto/hybrid-search-query.dto.ts`) | `HybridSearchQueryDto` con `@IsString()`, `@IsOptional() @IsInt() @Min(1) @Max(50)` |
| `parseQueryRequest()` (`query/dto/query-request.dto.ts`, Fase 5) | `QueryRequestDto`, mismo criterio |

Ambos casos: se borra la función de parseo manual y su test; el controller cambia `@Body() body: unknown` por `@Body() dto: HybridSearchQueryDto` (o `QueryRequestDto`), y Nest valida automáticamente vía el `ValidationPipe` global — el controller ya no necesita invocar ninguna función de validación explícita.

## 4. Filtro de excepciones global: contrato de error consistente

**Decisión:** todas las respuestas de error (`400`, `404`, `413`, `503`, `500`) pasan por un `AllExceptionsFilter` que devuelve esta forma exacta:

```json
{
  "statusCode": 404,
  "message": "No se encontró el documento \"...\"",
  "error": "Not Found",
  "timestamp": "2026-08-10T12:00:00.000Z",
  "path": "/documents/xyz/query"
}
```

**Por qué:** hoy cada excepción HTTP de Nest devuelve una forma ligeramente distinta según el tipo (`BadRequestException` vs `ServiceUnavailableException` vs un `Error` genérico no capturado). Un frontend (Fase 7) necesita poder confiar en una forma única para mostrar errores de manera consistente, sin un `if` distinto por tipo de excepción.

```typescript
// src/common/filters/all-exceptions.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Error interno del servidor';

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message ?? message,
      error: HttpStatus[status] ?? 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

**Nota sobre errores no capturados (`500`):** el filtro nunca expone el `stack trace` ni el mensaje interno de un `Error` genérico no controlado en la respuesta HTTP — devuelve siempre `"Error interno del servidor"` para esos casos, y loguea el error real del lado del servidor (`console.error` o el logger de Nest) para debugging. No filtrar detalles internos de errores inesperados hacia el cliente es una práctica básica de seguridad, independientemente de que este proyecto no tenga usuarios no confiables todavía.

## 5. Configuración de `@nestjs/swagger`

```typescript
// src/main.ts
const config = new DocumentBuilder()
  .setTitle('RAG Pipeline API')
  .setDescription('API del pipeline RAG multi-índice (ingesta, indexado, retrieval, generación)')
  .setVersion('1.0')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

Cada DTO existente recibe `@ApiProperty()` (o `@ApiPropertyOptional()` donde corresponda) por campo — trabajo mecánico pero necesario para que el Swagger generado sea útil, no solo presente.

## 6. Documentar el endpoint de subida de archivo (multipart)

`POST /documents` no tiene un DTO de clase (usa `FileInterceptor` directamente), así que Swagger no lo infiere solo. Se anota manualmente:

```typescript
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: { file: { type: 'string', format: 'binary' } },
  },
})
@Post()
async upload(...) { ... }
```