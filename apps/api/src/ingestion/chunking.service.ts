import { Injectable } from '@nestjs/common';

export interface RawChunk {
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  approxPage: number;
}

export interface ChunkingOptions {
  chunkSize?: number; // en tokens aproximados (palabras)
  overlap?: number;
  numPages?: number; // para calcular approxPage; si no se pasa, todo es página 1
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
    const numPages = options.numPages ?? 1;

    if (chunkSize <= overlap) {
      throw new Error('chunkSize debe ser mayor que overlap');
    }

    const tokens = this.tokenize(text);
    if (tokens.length === 0) {
      return [];
    }

    const step = chunkSize - overlap;
    const chunks: RawChunk[] = [];
    const charsPerPage = text.length / numPages;

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
        approxPage: Math.floor(startOffset / charsPerPage) + 1,
      });

      // Si esta ventana ya llegó al final del texto, no hace falta otra vuelta.
      if (i + chunkSize >= tokens.length) break;
    }

    return chunks;
  }

  private tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    for (const match of text.matchAll(/\S+/g)) {
      tokens.push({ start: match.index as number, end: (match.index as number) + match[0].length });
    }
    return tokens;
  }
}