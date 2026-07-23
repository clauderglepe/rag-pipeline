import { Injectable } from '@nestjs/common';
import { ExtractedPage } from './pdf-extractor.service';

export interface RawChunk {
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  page: number; // ahora exacta, no aproximada
}

export interface ChunkingOptions {
  chunkSize?: number;
  overlap?: number;
  pages?: ExtractedPage[]; // reemplaza a `numPages`
}

interface Token {
  start: number;
  end: number;
}

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_OVERLAP = 50;

@Injectable()
export class ChunkingService {
  chunk(text: string, options: ChunkingOptions = {}): RawChunk[] {
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const overlap = options.overlap ?? DEFAULT_OVERLAP;
    const pages = options.pages ?? [];

    if (chunkSize <= overlap) {
      throw new Error('chunkSize debe ser mayor que overlap');
    }

    const tokens = this.tokenize(text);
    if (tokens.length === 0) {
      return [];
    }

    const step = chunkSize - overlap;
    const chunks: RawChunk[] = [];

    for (let i = 0, index = 0; i < tokens.length; i += step, index += 1) {
      const windowTokens = tokens.slice(i, i + chunkSize);
      if (windowTokens.length === 0) break;

      const startOffset = windowTokens[0].start;
      const endOffset = windowTokens[windowTokens.length - 1].end;

      chunks.push({
        index,
        text: text.slice(startOffset, endOffset),
        startOffset,
        endOffset,
        page: this.findPage(startOffset, pages),
      });

      if (i + chunkSize >= tokens.length) break;
    }

    return chunks;
  }

  private findPage(offset: number, pages: ExtractedPage[]): number {
    for (const page of pages) {
      if (offset >= page.startOffset && offset < page.endOffset) {
        return page.pageNumber;
      }
    }
    // Cae en un separador entre páginas (o no se pasaron páginas):
    // asignamos la última página conocida antes de ese offset.
    const before = pages.filter((p) => p.startOffset <= offset);
    return before.length > 0 ? before[before.length - 1].pageNumber : 1;
  }

  private tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    for (const match of text.matchAll(/\S+/g)) {
      tokens.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    return tokens;
  }
}
