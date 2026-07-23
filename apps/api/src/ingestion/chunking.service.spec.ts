import { ChunkingService } from './chunking.service';
import { ExtractedPage } from './pdf-extractor.service';

function words(count: number): string {
  return Array.from({ length: count }, (_, i) => `word${i}`).join(' ');
}

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    service = new ChunkingService();
  });

  it('genera un único chunk si el texto es más corto que chunkSize', () => {
    const text = words(300);
    const chunks = service.chunk(text, { chunkSize: 500, overlap: 50 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(text);
  });

  it('genera 3 chunks para ~1200 tokens con solapamiento correcto', () => {
    const text = words(1200);
    const chunks = service.chunk(text, { chunkSize: 500, overlap: 50 });

    expect(chunks).toHaveLength(3);

    const chunk0Words = chunks[0].text.split(' ');
    const chunk1Words = chunks[1].text.split(' ');
    expect(chunk1Words.slice(0, 50)).toEqual(chunk0Words.slice(-50));
  });

  it('no genera un chunk final duplicado', () => {
    const text = words(500);
    const chunks = service.chunk(text, { chunkSize: 500, overlap: 50 });

    expect(chunks).toHaveLength(1);
  });

  it('asigna la página exacta según los límites reales pasados', () => {
    const text = words(1200);
    // Simulamos 3 páginas de tamaños distintos, no uniformes —
    // justo el caso que la heurística anterior no manejaba bien.
    const thirdLen = Math.floor(text.length / 3);
    const pages: ExtractedPage[] = [
      { pageNumber: 1, text: '', startOffset: 0, endOffset: thirdLen },
      {
        pageNumber: 2,
        text: '',
        startOffset: thirdLen,
        endOffset: thirdLen * 2,
      },
      {
        pageNumber: 3,
        text: '',
        startOffset: thirdLen * 2,
        endOffset: text.length,
      },
    ];

    const chunks = service.chunk(text, { chunkSize: 500, overlap: 50, pages });

    expect(chunks[0].page).toBe(1);
    expect(chunks[chunks.length - 1].page).toBe(3);
  });

  it('devuelve un array vacío para texto vacío', () => {
    expect(service.chunk('')).toEqual([]);
  });
});
