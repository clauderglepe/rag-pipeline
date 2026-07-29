// src/index/index.module.ts
import { Module } from '@nestjs/common';
import { IndexController } from './index.controller';
import { IndexingService } from './indexing.service';
import { EMBEDDING_PROVIDER } from './embedding-provider.interface';
import { OllamaEmbeddingProvider } from './ollama-embedding.provider';
import { VECTOR_INDEX } from './vector-index.interface';
import { InMemoryVectorIndex } from './in-memory-vector-index';
import { IngestionModule } from '../ingestion/ingestion.module';

@Module({
  imports: [IngestionModule], // para poder inyectar CHUNK_REPOSITORY
  controllers: [IndexController],
  providers: [
    IndexingService,
    { provide: EMBEDDING_PROVIDER, useClass: OllamaEmbeddingProvider },
    { provide: VECTOR_INDEX, useClass: InMemoryVectorIndex },
  ],
  exports: [IndexingService],
})
export class IndexModule { }