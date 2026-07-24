import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PdfExtractorService } from './pdf-extractor.service';
import { ChunkingService } from './chunking.service';
import { CHUNK_REPOSITORY } from './chunk-repository.interface';
import type { Chunk, ChunkRepository } from './chunk-repository.interface';
import { DocumentResponseDto } from './dto/document-response.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class IngestionService {
  constructor(
    private readonly pdfExtractor: PdfExtractorService,
    private readonly chunkingService: ChunkingService,
    @Inject(CHUNK_REPOSITORY) private readonly chunkRepository: ChunkRepository,
  ) { }
  async ingest(buffer: Buffer): Promise<DocumentResponseDto> {
    const documentId = randomUUID();

    let extracted: Awaited<ReturnType<PdfExtractorService['extract']>>;
    try {
      extracted = await this.pdfExtractor.extract(buffer);
    } catch (error) {
      // El mimetype pudo ser válido pero el contenido estar corrupto,
      // o ser un PDF escaneado sin texto extraíble — pdf-parse falla en ambos casos.
      throw new BadRequestException(
        'No se pudo extraer texto del PDF. ¿Está corrupto o es una imagen escaneada?',
      );
    }

    const rawChunks = this.chunkingService.chunk(extracted.fullText, {
      pages: extracted.pages,
    });

    if (rawChunks.length === 0) {
      throw new BadRequestException(
        'El PDF no contiene texto extraíble (¿está vacío o son solo imágenes escaneadas?)',
      );
    }
    const chunks: Chunk[] = rawChunks.map((raw) => ({
      id: `${documentId}:${raw.index}`,
      documentId,
      index: raw.index,
      text: raw.text,
      startOffset: raw.startOffset,
      endOffset: raw.endOffset,
      page: raw.page,
    }));

    await this.chunkRepository.save(chunks);
    return { documentId, chunkCount: chunks.length };
  }
}
