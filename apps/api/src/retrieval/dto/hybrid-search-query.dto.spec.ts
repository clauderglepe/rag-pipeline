import { parseHybridSearchQuery } from './hybrid-search-query.dto';

describe('parseLexicalSearchQuery', () => {
  it('acepta un query válido y aplica topK por defecto', () => {
    expect(parseHybridSearchQuery({ query: 'EC2' })).toEqual({ query: 'EC2', topK: 5 });
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
    expect(() => parseHybridSearchQuery(input)).toThrow();
  });
});