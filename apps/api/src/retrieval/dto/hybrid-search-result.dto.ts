export class HybridSearchResultDto {
  chunkId!: string;
  score!: number;
  page!: number;
  text!: string;
  foundIn!: Array<'semantic' | 'lexical'>;
}