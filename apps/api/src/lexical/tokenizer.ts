// src/lexical/tokenizer.ts

// \p{L} = cualquier letra Unicode (incluye á, ñ, etc.), \p{N} = cualquier dígito.
// Sin el flag /u y sin \p{...}, una regex como \W solo reconoce ASCII y partiría
// palabras con acentos por la mitad — importante para un corpus que puede estar en
// español, no solo en inglés.
const TOKEN_SPLIT_REGEX = /[^\p{L}\p{N}_]+/u;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(TOKEN_SPLIT_REGEX)
    .filter((token) => token.length > 0);
}