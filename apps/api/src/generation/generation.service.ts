import { Inject, Injectable } from '@nestjs/common';
import { LLM_PROVIDER,type LlmProvider } from './llm-provider.interface';
import { ContextChunk, buildPrompt } from './prompt-builder';

// Implementación real: tarea "feat(generation): add generation service"

@Injectable()
export class GenerationService {
  constructor(
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
  ) {}

  async generateAnswer(query: string, chunks: ContextChunk[]): Promise<string> {
    const messages = buildPrompt(query, chunks);
    return this.llmProvider.chat(messages);
  }
}