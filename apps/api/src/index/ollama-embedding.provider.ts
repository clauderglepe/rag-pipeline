// src/index/ollama-embedding.provider.ts
import { Injectable } from '@nestjs/common';
import { EmbeddingProvider } from './embedding-provider.interface';

// Implementación real: tarea "feat(index): add ollama embedding provider"
@Injectable()
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error('Not implemented yet');
  }
}
