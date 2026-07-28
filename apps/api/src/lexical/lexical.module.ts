// src/lexical/lexical.module.ts
import { Module } from '@nestjs/common';
import { LexicalController } from './lexical.controller';
import { LexicalIndexingService } from './lexical-indexing.service';
import { LEXICAL_INDEX } from './lexical-index.interface';
import { Bm25LexicalIndex } from './bm25-lexical-index';
import { IngestionModule } from '../ingestion/ingestion.module';

@Module({
  imports: [IngestionModule], // para inyectar CHUNK_REPOSITORY, igual que IndexModule
  controllers: [LexicalController],
  providers: [
    LexicalIndexingService,
    { provide: LEXICAL_INDEX, useClass: Bm25LexicalIndex },
  ],
})
export class LexicalModule {}