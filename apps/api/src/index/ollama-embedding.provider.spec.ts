import { ServiceUnavailableException } from '@nestjs/common';
import { OllamaEmbeddingProvider } from './ollama-embedding.provider';

describe('OllamaEmbeddingProvider', () => {
  let provider: OllamaEmbeddingProvider;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'OLLAMA_BASE_URL') return 'http://localhost:11434';
        if (key === 'OLLAMA_EMBEDDING_MODEL') return 'nomic-embed-text';
        return undefined;
      }),
    };
    provider = new OllamaEmbeddingProvider(configService as any);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('devuelve un array vacío sin llamar a fetch si no hay textos', async () => {
    const result = await provider.embed([]);

    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('llama a /api/embed con el modelo y los textos correctos', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        embeddings: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
      }),
    });

    const result = await provider.embed(['hola', 'mundo']);

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/embed',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ model: 'nomic-embed-text', input: ['hola', 'mundo'] }),
      }),
    );
    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });

  it('lanza ServiceUnavailableException si falla la conexión', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(provider.embed(['hola'])).rejects.toThrow(ServiceUnavailableException);
  });

  it('lanza ServiceUnavailableException si Ollama responde con error', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'model not found',
    });

    await expect(provider.embed(['hola'])).rejects.toThrow(ServiceUnavailableException);
  });

  it('lanza un error si el número de embeddings no coincide con los textos enviados', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: [[0.1, 0.2]] }), // se enviaron 2 textos, llega 1
    });

    await expect(provider.embed(['hola', 'mundo'])).rejects.toThrow('se esperaban 2 embeddings');
  });
});