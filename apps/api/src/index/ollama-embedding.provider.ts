// src/index/ollama-embedding.provider.ts
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingProvider } from './embedding-provider.interface';
import { EnvironmentVariables } from '../config/env.validation';

interface OllamaEmbedResponse {
  embeddings: number[][];
}

@Injectable()
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const baseUrl = this.configService.get('OLLAMA_BASE_URL', { infer: true });
    const model = this.configService.get('OLLAMA_EMBEDDING_MODEL', { infer: true });

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: texts }),
      });
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

    const data = (await response.json()) as OllamaEmbedResponse;

    if (!Array.isArray(data.embeddings) || data.embeddings.length !== texts.length) {
      throw new Error(
        `Respuesta inesperada de Ollama: se esperaban ${texts.length} embeddings, ` +
          `se recibieron ${data.embeddings?.length ?? 0}`,
      );
    }

    return data.embeddings;
  }
}