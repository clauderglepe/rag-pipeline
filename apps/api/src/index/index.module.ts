// src/index/index.module.ts
import { Module } from '@nestjs/common';
import { IndexController } from './index.controller';
import { IndexingService } from './indexing.service';
import { OllamaEmbeddingProvider } from './ollama-embedding.provider';
import { InMemoryVectorIndex } from './in-memory-vector-index';
import { EMBEDDING_PROVIDER } from './embedding-provider.interface';
import { VECTOR_INDEX } from './vector-index.interface';

@Module({
  controllers: [IndexController],
  providers: [
    IndexingService,
    { provide: EMBEDDING_PROVIDER, useClass: OllamaEmbeddingProvider },
    { provide: VECTOR_INDEX, useClass: InMemoryVectorIndex },
  ],
})
export class IndexModule {}
