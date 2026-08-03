import { NotFoundException } from '@nestjs/common';
import { QueryService } from './query.service';
import { RetrievalService } from '../retrieval/retrieval.service';
import { GenerationService } from '../generation/generation.service';

describe('QueryService', () => {
  let service: QueryService;
  let retrievalService: jest.Mocked<RetrievalService>;
  let generationService: jest.Mocked<GenerationService>;

  beforeEach(() => {
    retrievalService = { search: jest.fn() } as any;
    generationService = { generateAnswer: jest.fn() } as any;
    service = new QueryService(retrievalService, generationService);
  });

  it('devuelve un mensaje fijo sin llamar al LLM si no hay contexto', async () => {
    retrievalService.search.mockResolvedValue([]);

    const result = await service.ask('doc-1', 'pregunta');

    expect(generationService.generateAnswer).not.toHaveBeenCalled();
    expect(result.sources).toEqual([]);
    expect(result.answer).toContain('No hay contenido indexado');
  });

  it('genera una respuesta con el contexto recuperado', async () => {
    retrievalService.search.mockResolvedValue([
      {
        chunkId: 'c0',
        score: 0.9,
        page: 3,
        text: 'texto relevante',
        foundIn: ['semantic', 'lexical'],
      },
    ]);
    generationService.generateAnswer.mockResolvedValue('la respuesta del LLM');

    const result = await service.ask('doc-1', '¿qué es EC2?');

    expect(generationService.generateAnswer).toHaveBeenCalledWith('¿qué es EC2?', [
      { page: 3, text: 'texto relevante' },
    ]);
    expect(result.answer).toBe('la respuesta del LLM');
    expect(result.sources).toEqual([{ chunkId: 'c0', page: 3, foundIn: ['semantic', 'lexical'] }]);
  });

  it('pide CONTEXT_TOP_K (5) chunks a RetrievalService, no un valor arbitrario', async () => {
    retrievalService.search.mockResolvedValue([]);

    await service.ask('doc-1', 'pregunta');

    expect(retrievalService.search).toHaveBeenCalledWith('doc-1', 'pregunta', 5);
  });

  it('propaga NotFoundException si el documento no existe', async () => {
    retrievalService.search.mockRejectedValue(new NotFoundException('no existe'));

    await expect(service.ask('no-existe', 'pregunta')).rejects.toThrow(NotFoundException);
  });
});