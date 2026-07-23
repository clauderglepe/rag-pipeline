// src/ingestion/pdf-extractor.service.spec.ts
import * as fs from 'fs';
import * as path from 'path';
import { PdfExtractorService } from './pdf-extractor.service';

describe('PdfExtractorService', () => {
  let service: PdfExtractorService;

  beforeEach(() => {
    service = new PdfExtractorService();
  });

  it('extrae texto no vacío por página de un PDF real', async () => {
    const fixturePath = path.join(__dirname, '../../test/fixtures/sample.pdf');
    const buffer = fs.readFileSync(fixturePath);

    const doc = await service.extract(buffer);

    expect(doc.totalPages).toBeGreaterThan(0);
    expect(doc.pages).toHaveLength(doc.totalPages);
    expect(doc.fullText.length).toBeGreaterThan(0);

    // TODO: reemplaza por una frase real de la primera página de TU pdf.
    expect(doc.pages[0].text).toContain(
      'All that, however, is way more than we have time to cover in a foundational class like this one.',
    );
  });

  it('los offsets de cada página son consistentes con fullText', async () => {
    const fixturePath = path.join(__dirname, '../../test/fixtures/sample.pdf');
    const buffer = fs.readFileSync(fixturePath);

    const doc = await service.extract(buffer);

    for (const page of doc.pages) {
      const slice = doc.fullText.slice(page.startOffset, page.endOffset);
      expect(slice).toBe(page.text);
    }
  });

  it('rechaza un buffer que no es un pdf válido', async () => {
    const invalidBuffer = Buffer.from('esto no es un pdf');

    await expect(service.extract(invalidBuffer)).rejects.toThrow();
  });
});
