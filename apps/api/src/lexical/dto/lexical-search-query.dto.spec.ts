import { parseLexicalSearchQuery } from './lexical-search-query.dto';

describe('parseLexicalSearchQuery', () => {
  it('acepta un query válido y aplica topK por defecto', () => {
    expect(parseLexicalSearchQuery({ query: 'EC2' })).toEqual({ query: 'EC2', topK: 5 });
  });

  it.each([
    [{}, 'sin query'],
    [{ query: '' }, 'query vacío'],
    [{ query: 123 }, 'query no string'],
    [{ query: 'ok', topK: 0 }, 'topK en cero'],
    [{ query: 'ok', topK: 51 }, 'topK sobre el máximo'],
    [null, 'body nulo'],
  ])('rechaza: %o (%s)', (...input) => {
    expect(() => parseLexicalSearchQuery(input)).toThrow();
  });
});