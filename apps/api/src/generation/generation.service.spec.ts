// src/generation/generation.service.spec.ts
import { GenerationService } from './generation.service';
import { LlmProvider } from './llm-provider.interface';

describe('GenerationService', () => {
  let service: GenerationService;
  let llmProvider: jest.Mocked<LlmProvider>;

  beforeEach(() => {
    llmProvider = { chat: jest.fn() };
    service = new GenerationService(llmProvider);
  });

  it('construye el prompt y llama al LlmProvider', async () => {
    llmProvider.chat.mockResolvedValue('la respuesta generada');

    const result = await service.generateAnswer('¿qué es EC2?', [
      { page: 3, text: 'EC2 es...' },
    ]);

    expect(result).toBe('la respuesta generada');
    expect(llmProvider.chat).toHaveBeenCalledWith([
      expect.objectContaining({ role: 'system' }),
      { role: 'user', content: '¿qué es EC2?' },
    ]);
  });

  it('funciona con contexto vacío', async () => {
    llmProvider.chat.mockResolvedValue('no tengo información suficiente en el contexto');

    const result = await service.generateAnswer('pregunta', []);

    expect(result).toBe('no tengo información suficiente en el contexto');
  });

  it('propaga errores del LlmProvider sin envolverlos', async () => {
    const error = new Error('ollama no disponible');
    llmProvider.chat.mockRejectedValue(error);

    await expect(service.generateAnswer('pregunta', [])).rejects.toThrow('ollama no disponible');
  });
});