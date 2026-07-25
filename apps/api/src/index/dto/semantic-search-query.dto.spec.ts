import { parseSemanticSearchQuery } from './semantic-search-query.dto';

describe('parseSemanticSearchQuery', () => {
  it('acepta un query válido y aplica topK por defecto', () => {
    const result = parseSemanticSearchQuery({ query: '¿qué es el RAG?' });

    expect(result).toEqual({ query: '¿qué es el RAG?', topK: 5 });
  });

  it('acepta un topK explícito', () => {
    const result = parseSemanticSearchQuery({ query: 'algo', topK: 10 });
    expect(result.topK).toBe(10);
  });

  it('recorta espacios del query', () => {
    const result = parseSemanticSearchQuery({ query: '  algo  ' });
    expect(result.query).toBe('algo');
  });

  it.each([
    [{}, 'sin query'],
    [{ query: '' }, 'query vacío'],
    [{ query: '   ' }, 'query solo espacios'],
    [{ query: 123 }, 'query no string'],
    [{ query: 'ok', topK: 0 }, 'topK en cero'],
    [{ query: 'ok', topK: -1 }, 'topK negativo'],
    [{ query: 'ok', topK: 1.5 }, 'topK no entero'],
    [{ query: 'ok', topK: 51 }, 'topK sobre el máximo'],
    [null, 'body nulo'],
    ['string', 'body no es objeto'],
  ])('rechaza: %o (%s)', (...input) => {
    expect(() => parseSemanticSearchQuery(input)).toThrow();
  });
});