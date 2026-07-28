// src/lexical/tokenizer.spec.ts
import { tokenize } from './tokenizer';

describe('tokenize', () => {
  it('convierte todo a minúsculas', () => {
    expect(tokenize('Hola MUNDO')).toEqual(['hola', 'mundo']);
  });

  it('separa por puntuación', () => {
    expect(tokenize('EC2, S3.')).toEqual(['ec2', 's3']);
  });

  it('no separa palabras con tildes o eñes', () => {
    expect(tokenize('está la información')).toEqual(['está', 'la', 'información']);
  });

  it('mantiene juntos términos alfanuméricos como EC2', () => {
    expect(tokenize('una instancia EC2 en AWS')).toEqual(['una', 'instancia', 'ec2', 'en', 'aws']);
  });

  it('descarta tokens vacíos de separadores repetidos', () => {
    expect(tokenize('hola,,,   mundo')).toEqual(['hola', 'mundo']);
  });

  it('devuelve un array vacío para texto vacío o solo puntuación', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('...   ,,,')).toEqual([]);
  });

  it('tokeniza igual un término embebido en texto que como consulta aislada', () => {
    // Este es el requirement de spec.md: "Tokenización consistente entre indexado y consulta"
    const fromDocument = tokenize('Aquí se explica qué es una instancia EC2 en detalle');
    const fromQuery = tokenize('EC2');

    expect(fromDocument).toContain(fromQuery[0]);
  });
});