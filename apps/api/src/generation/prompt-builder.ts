// src/generation/prompt-builder.ts
import { ChatMessage } from './llm-provider.interface';

export interface ContextChunk {
  page: number;
  text: string;
}

const SYSTEM_PROMPT_HEADER =
  `Eres un asistente que responde preguntas basándote EXCLUSIVAMENTE en el siguiente contexto extraído de un documento. Si el contexto no contiene información  suficiente para responder, dilo explícitamente — no inventes ni completes con  conocimiento propio. Cuando una afirmación provenga de una parte específica del  contexto, citá la página entre paréntesis, por ejemplo (p. 12). Responde en el  mismo idioma en el que está escrita la pregunta.`

export function buildPrompt(query: string, chunks: ContextChunk[]): ChatMessage[] {
  const contextBlock =
    chunks.length > 0
      ? chunks.map((chunk) => `[p. ${chunk.page}] ${chunk.text}`).join('\n\n')
      : '(sin contexto disponible)';

  return [
    { role: 'system', content: `${SYSTEM_PROMPT_HEADER}\n\nContexto:\n${contextBlock}` },
    { role: 'user', content: query }, // sin modificar — ver spec.md "La pregunta del usuario no se modifica"
  ];
}