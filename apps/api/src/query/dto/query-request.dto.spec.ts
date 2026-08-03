// src/query/dto/query-request.dto.spec.ts
import { parseQueryRequest } from './query-request.dto';

describe('parseQueryRequest', () => {
  it('acepta un query válido, preservándolo tal cual (sin recortar espacios)', () => {
    expect(parseQueryRequest({ query: '  ¿qué es EC2?  ' })).toEqual({
      query: '  ¿qué es EC2?  ',
    });
  });

  it.each([
    [{}, 'sin query'],
    [{ query: '' }, 'query vacío'],
    [{ query: '   ' }, 'query solo espacios (se rechaza igual, aunque no se recorte al devolver)'],
    [{ query: 123 }, 'query no string'],
    [null, 'body nulo'],
  ])('rechaza: %o (%s)', (...input) => {
    expect(() => parseQueryRequest(input)).toThrow();
  });
});