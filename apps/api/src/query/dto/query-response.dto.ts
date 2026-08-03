// src/query/dto/query-response.dto.ts
export class QuerySourceDto {
  chunkId!: string;
  page!: number;
  foundIn!: Array<'semantic' | 'lexical'>;
}

export class QueryResponseDto {
  answer!: string;
  sources!: QuerySourceDto[];
}