import { IngestionService } from './ingestion.service';
import { PdfExtractorService } from './pdf-extractor.service';
import { ChunkingService } from './chunking.service';
import { ChunkRepository } from './chunk-repository.interface';

describe('IngestionService', () => {
  let service: IngestionService;
  let pdfExtractor: jest.Mocked<PdfExtractorService>;
  let chunkingService: jest.Mocked<ChunkingService>;
  let chunkRepository: jest.Mocked<ChunkRepository>;

  beforeEach(() => {
    pdfExtractor = { extract: jest.fn() } as any;
    chunkingService = { chunk: jest.fn() } as any;
    chunkRepository = { save: jest.fn(), findByDocumentId: jest.fn() } as any;

    service = new IngestionService(pdfExtractor, chunkingService, chunkRepository);
  });

  it('orquesta extract -> chunk -> save y devuelve documentId + chunkCount', async () => {
    pdfExtractor.extract.mockResolvedValue({ fullText: 'hola mundo', pages: [], totalPages: 1 });
    chunkingService.chunk.mockReturnValue([
      { index: 0, text: 'hola mundo', startOffset: 0, endOffset: 10, page: 1 },
    ]);

    const result = await service.ingest(Buffer.from('fake-pdf'));

    expect(result.chunkCount).toBe(1);
    expect(chunkRepository.save).toHaveBeenCalledTimes(1);

    const savedChunks = chunkRepository.save.mock.calls[0][0];
    expect(savedChunks[0].documentId).toBe(result.documentId);
    expect(savedChunks[0].id).toBe(`${result.documentId}:0`);
  });

  it('lanza BadRequestException si la extracción falla', async () => {
    pdfExtractor.extract.mockRejectedValue(new Error('pdf corrupto'));

    await expect(service.ingest(Buffer.from('no-es-un-pdf'))).rejects.toThrow(
      'No se pudo extraer texto del PDF',
    );
  });
});