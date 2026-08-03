import { ServiceUnavailableException } from '@nestjs/common';
import { OllamaLlmProvider } from './ollama-llm.provider';

describe('OllamaLlmProvider', () => {
  let provider: OllamaLlmProvider;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'OLLAMA_BASE_URL') return 'http://localhost:11434';
        if (key === 'OLLAMA_GENERATION_MODEL') return 'qwen2.5:7b-instruct';
        return undefined;
      }),
    };
    provider = new OllamaLlmProvider(configService as any);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('llama a /api/chat con el modelo, los mensajes y stream:false', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: { role: 'assistant', content: 'una respuesta' }, done: true }),
    });

    const messages = [{ role: 'user' as const, content: 'hola' }];
    const result = await provider.chat(messages);

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ model: 'qwen2.5:7b-instruct', messages, stream: false }),
      }),
    );
    expect(result).toBe('una respuesta');
  });

  it('lanza ServiceUnavailableException si falla la conexión', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(provider.chat([{ role: 'user', content: 'hola' }])).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('lanza ServiceUnavailableException si Ollama responde con error', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'model not found',
    });

    await expect(provider.chat([{ role: 'user', content: 'hola' }])).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('lanza un error si la respuesta no tiene message.content', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ done: true }), // sin "message"
    });

    await expect(provider.chat([{ role: 'user', content: 'hola' }])).rejects.toThrow(
      'falta message.content',
    );
  });
});