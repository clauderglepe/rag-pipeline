// src/ingestion/pdf-extractor.service.ts
import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { CanvasFactory } from 'pdf-parse/worker';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  startOffset: number; // offset dentro de fullText
  endOffset: number;
}

export interface ExtractedDocument {
  fullText: string;
  pages: ExtractedPage[];
  totalPages: number;
}
const PAGE_SEPARATOR = '\n\n';

@Injectable()
export class PdfExtractorService {
  async extract(data: Buffer): Promise<ExtractedDocument> {
    const parser = new PDFParse({ data, CanvasFactory });
    
    try {
      const result = await parser.getText();

      let fullText = '';
      const pages: ExtractedPage[] = [];

      for (const page of result.pages) {
        const startOffset = fullText.length;
        fullText += page.text;
        const endOffset = fullText.length;

        pages.push({ pageNumber: page.num, text: page.text, startOffset, endOffset });

        fullText += PAGE_SEPARATOR;
      }

      return { fullText, pages, totalPages: result.total };

    } finally {
      // Libera recursos del worker interno — importante llamarlo siempre,
      // incluso si getText() lanza una excepción.
      await parser.destroy();
    }
  }
}