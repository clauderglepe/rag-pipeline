// src/ingestion/pdf-extractor.service.ts
import { Injectable } from '@nestjs/common';
import {PDFParse} from 'pdf-parse';
import { CanvasFactory } from 'pdf-parse/worker';

// Implementación real: tarea "feat(ingestion): extract text from pdf"
@Injectable()
export class PdfExtractorService {
  async extractText(data: Buffer): Promise<string> {
    const parser = new PDFParse({data, CanvasFactory});
    const result = await parser.getText();
    return result.text;
  }
}