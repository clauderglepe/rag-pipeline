import path from 'path';
import fs from 'fs';
import { PdfExtractorService } from './pdf-extractor.service';


describe('PdfExtractorService', () => {
  let service: PdfExtractorService;

  beforeEach(() => {
    service = new PdfExtractorService();
  });
  it('extrae texto no vacío de un PDF real', async () => {
    const fixturePath = path.join(__dirname, '../../test/fixtures/sample.pdf');
    const buffer = fs.readFileSync(fixturePath);

    const text = await service.extractText(buffer);

    const sentence = 'Morgan represents the server part of the client-server model.'
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain(sentence);
  });
  it('rechaza un buffer que no es un pdf válido', async () => {
    const invalidBuffer = Buffer.from('esto no es un pdf');

    await expect(service.extractText(invalidBuffer)).rejects.toThrow();
  });
});
