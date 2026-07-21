# Tareas — 0002-pdf-ingestion

Cada tarea marcada corresponde a un commit atómico (Conventional Commits entre paréntesis).

- [ ] Crear módulo `ingestion` con estructura de carpetas (`chore(ingestion): scaffold module`)
- [ ] Instalar dependencias: `pdf-parse`, `@types/multer` (`chore: add pdf-parse dependency`)
- [ ] Implementar `PdfExtractorService` (wrapper de `pdf-parse`) + test unitario con un PDF
      fixture pequeño en `test/fixtures/` (`feat(ingestion): extract text from pdf`)
- [ ] Implementar `ChunkingService` (función pura, fixed-size + overlap) + tests unitarios
      cubriendo: chunk exacto, overlap correcto, texto más corto que un chunk
      (`feat(ingestion): add fixed-size chunking with overlap`)
- [ ] Implementar `ChunkRepository` (interfaz) + `InMemoryChunkRepository`
      (`feat(ingestion): add in-memory chunk repository`)
- [ ] Implementar `IngestionController` (`POST /documents`, multipart, validación de tipo
      y tamaño con `ParseFilePipe`) + `IngestionService` que orquesta todo
      (`feat(ingestion): add document upload endpoint`)
- [ ] Test de integración: subir el PDF fixture real y verificar que se generan chunks
      con metadata correcta (`test(ingestion): add upload integration test`)
- [ ] Actualizar `openspec/specs/pdf-ingestion/spec.md` con la capability ya implementada
      (`docs(openspec): mark pdf-ingestion spec as implemented`)
- [ ] Actualizar checklist de Fase 1 en el README raíz (`docs: mark phase 1 as done`)

## Definición de "hecho"

- `npm run test` pasa (unitarios + integración de este módulo).
- `POST /documents` con el PDF real del libro responde con el número de chunks generados
  y no lanza error.
- El spec en `openspec/specs/` refleja el comportamiento real (no el propuesto).