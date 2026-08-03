import { Module } from '@nestjs/common';
import { GenerationService } from './generation.service';
import { LLM_PROVIDER } from './llm-provider.interface';
import { OllamaLlmProvider } from './ollama-llm.provider';

@Module({
  providers: [
    GenerationService,
    { provide: LLM_PROVIDER, useClass: OllamaLlmProvider}
  ],
  exports: [GenerationService],
})
export class GenerationModule {}
