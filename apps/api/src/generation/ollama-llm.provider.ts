import { Injectable } from '@nestjs/common';
import { ChatMessage, LlmProvider } from './llm-provider.interface';

// Implementación real: tarea "feat(generation): add ollama llm provider"
@Injectable()
export class OllamaLlmProvider implements LlmProvider {
  async chat(_messages: ChatMessage[]): Promise<string> {
    throw new Error('Not implemented yet');
  }
}