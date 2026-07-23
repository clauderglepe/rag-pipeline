import { validate } from "./env.validation";

describe('validate (env)', () => { 
    const validEnv = {
    OLLAMA_BASE_URL: 'http://localhost:11434',
    OLLAMA_EMBEDDING_MODEL: 'nomic-embed-text',
    EMBEDDING_BATCH_SIZE: '32',
  };

  it('acepta un entorno válido y convierte tipos', () => {
    const result = validate(validEnv);

    expect(result.OLLAMA_BASE_URL).toBe('http://localhost:11434');
    expect(result.EMBEDDING_BATCH_SIZE).toBe(32);
    expect(typeof result.EMBEDDING_BATCH_SIZE).toBe('number');
  });

  it('rechaza una URL inválida', () => {
    expect(() => validate({ ...validEnv, OLLAMA_BASE_URL: 'no-es-una-url' })).toThrow();
  });

  it('rechaza un batch size no numérico', () => {
    expect(() => validate({ ...validEnv, EMBEDDING_BATCH_SIZE: 'treinta y dos' })).toThrow();
  });

  it('rechaza una variable faltante', () => {
    const { OLLAMA_EMBEDDING_MODEL, ...incomplete } = validEnv;
    expect(() => validate(incomplete)).toThrow();
  });
});