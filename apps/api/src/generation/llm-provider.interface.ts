export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmProvider {
  chat(messages: ChatMessage[]): Promise<string>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');