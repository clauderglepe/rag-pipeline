// Valores estándar (los mismos que usan Lucene/Elasticsearch/OpenSearch) — ver design.md §6.
export const BM25_K1 = 1.5;
export const BM25_B = 0.75;

export interface CorpusStats {
  totalDocuments: number; // N
  averageDocumentLength: number; // avgdl
  documentFrequencies: Map<string, number>; // término -> en cuántos chunks aparece (n(qi))
}

export function computeCorpusStats(corpus: string[][]): CorpusStats {
  const totalDocuments = corpus.length;

  if (totalDocuments === 0) {
    return { totalDocuments: 0, averageDocumentLength: 0, documentFrequencies: new Map() };
  }

  const totalLength = corpus.reduce((sum, tokens) => sum + tokens.length, 0);
  const averageDocumentLength = totalLength / totalDocuments;

  const documentFrequencies = new Map<string, number>();
  for (const tokens of corpus) {
    // Set: un término cuenta una vez por chunk aunque aparezca varias veces en él —
    // n(qi) es "en cuántos documentos aparece", no "cuántas veces en total".
    const uniqueTerms = new Set(tokens);
    for (const term of uniqueTerms) {
      documentFrequencies.set(term, (documentFrequencies.get(term) ?? 0) + 1);
    }
  }

  return { totalDocuments, averageDocumentLength, documentFrequencies };
}

function idf(totalDocuments: number, documentFrequency: number): number {
  return Math.log((totalDocuments - documentFrequency + 0.5) / (documentFrequency + 0.5) + 1);
}

function termFrequency(term: string, documentTokens: string[]): number {
  return documentTokens.filter((t) => t === term).length;
}

export function bm25Score(
  queryTerms: string[],
  documentTokens: string[],
  stats: CorpusStats,
  k1: number = BM25_K1,
  b: number = BM25_B,
): number {
  const docLength = documentTokens.length;
  let score = 0;

  for (const term of queryTerms) {
    const df = stats.documentFrequencies.get(term) ?? 0;
    if (df === 0) continue; // el término no aparece en ningún chunk del corpus

    const tf = termFrequency(term, documentTokens);
    if (tf === 0) continue; // aparece en el corpus, pero no en ESTE chunk

    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + (b * docLength) / stats.averageDocumentLength);

    score += idf(stats.totalDocuments, df) * (numerator / denominator);
  }

  return score;
}