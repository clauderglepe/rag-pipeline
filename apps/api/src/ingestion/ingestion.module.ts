import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { PdfExtractorService } from './pdf-extractor.service';
import { ChunkingService } from './chunking.service';
import { CHUNK_REPOSITORY } from './chunk-repository.interface';
import { InMemoryChunkRepository } from './in-memory-chunk-repository';

@Module({
  controllers: [IngestionController],
  providers: [
    IngestionService,
    PdfExtractorService,
    ChunkingService,
    { provide: CHUNK_REPOSITORY, useClass: InMemoryChunkRepository },
  ],
  exports: [CHUNK_REPOSITORY],
})
export class IngestionModule { }
