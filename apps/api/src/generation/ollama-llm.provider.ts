import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ChatMessage, LlmProvider } from './llm-provider.interface';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/config/env.validation';


interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
}

@Injectable()
export class OllamaLlmProvider implements LlmProvider {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ){}
  async chat(messages: ChatMessage[]): Promise<string> {
    const baseUrl = this.configService.get('OLLAMA_BASE_URL');
    const model   = this.configService.get('OLLAMA_GENERATION_MODEL');
    
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({model, messages, stream: false}),
      })
      
    } catch {
      throw new ServiceUnavailableException(
        `No se pudo conectar con Ollama en ${baseUrl}. ¿Está corriendo? (docker compose up -d)`,
      );      
    }
    if (!response.ok) {
      const body = await response.text();
      throw new ServiceUnavailableException(
        `Ollama respondió con error (${response.status}): ${body}. ` +
          `¿El modelo "${model}" está descargado? (ollama pull ${model})`,
      );
    }
    
    const data = (await response.json()) as OllamaChatResponse;

    if (typeof data.message?.content !== 'string') {
      throw new Error('Respuesta inesperada de Ollama: falta message.content');
    }

    return data.message.content;    
  }
}