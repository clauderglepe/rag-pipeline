// src/index/dto/semantic-search-result.dto.ts
export class SemanticSearchResultDto {
  chunkId!: string;
  score!: number;
  page!: number;
  text!: string;
}
