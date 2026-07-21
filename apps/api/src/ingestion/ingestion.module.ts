import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { PdfExtractorService } from './pdf-extractor.service';

@Module({
  controllers: [IngestionController],
  providers: [IngestionService, PdfExtractorService],
})
export class IngestionModule {}
