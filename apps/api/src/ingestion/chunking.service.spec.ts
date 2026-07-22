import { ChunkingService } from './chunking.service';

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
    expect(chunks[0].startOffset).toBe(0);
    expect(chunks[0].endOffset).toBe(text.length);
  });

  it('genera 3 chunks para ~1200 tokens con solapamiento correcto', () => {
    const text = words(1200);

    const chunks = service.chunk(text, { chunkSize: 500, overlap: 50 });

    expect(chunks).toHaveLength(3);

    // El final del chunk 0 y el inicio del chunk 1 deben solaparse ~50 palabras
    const chunk0Words = chunks[0].text.split(' ');
    const chunk1Words = chunks[1].text.split(' ');
    const overlapWords = chunk0Words.slice(-50);

    expect(chunk1Words.slice(0, 50)).toEqual(overlapWords);
  });

  it('no genera un chunk final duplicado cuando la última ventana ya cubre el resto', () => {
    const text = words(500); // exactamente un chunkSize

    const chunks = service.chunk(text, { chunkSize: 500, overlap: 50 });

    expect(chunks).toHaveLength(1);
  });

  it('calcula approxPage según numPages y el offset', () => {
    const text = words(1200);

    const chunks = service.chunk(text, { chunkSize: 500, overlap: 50, numPages: 10 });

    expect(chunks[0].approxPage).toBe(1);
    expect(chunks[chunks.length - 1].approxPage).toBeGreaterThan(1);
  });

  it('devuelve un array vacío para texto vacío', () => {
    expect(service.chunk('')).toEqual([]);
  });
});
