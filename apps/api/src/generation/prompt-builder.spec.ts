import { buildPrompt } from './prompt-builder';

describe('buildPrompt', () => {
  it('construye dos mensajes: system con contexto, user con la pregunta', () => {
    const messages = buildPrompt('¿qué es EC2?', [{ page: 3, text: 'EC2 es...' }]);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('preserva la pregunta del usuario sin modificarla', () => {
    const query = '  ¿Qué es   EC2?  '; // espacios raros a propósito
    const messages = buildPrompt(query, []);

    expect(messages[1].content).toBe(query); // exactamente igual, sin trim ni cambios
  });

  it('incluye cada chunk con su número de página en el formato [p. N]', () => {
    const messages = buildPrompt('pregunta', [
      { page: 3, text: 'contenido de la página 3' },
      { page: 7, text: 'contenido de la página 7' },
    ]);

    expect(messages[0].content).toContain('[p. 3] contenido de la página 3');
    expect(messages[0].content).toContain('[p. 7] contenido de la página 7');
  });

  it('preserva el orden de los chunks recibido, no lo reordena', () => {
    const messages = buildPrompt('pregunta', [
      { page: 9, text: 'segundo por relevancia, pero llega primero aquí' },
      { page: 1, text: 'primero por página, pero llega segundo aquí' },
    ]);

    const indexA = messages[0].content.indexOf('segundo por relevancia');
    const indexB = messages[0].content.indexOf('primero por página');
    expect(indexA).toBeLessThan(indexB); // respeta el orden de entrada, no ordena por page
  });

  it('instruye explícitamente a no inventar información', () => {
    const messages = buildPrompt('pregunta', []);
    expect(messages[0].content).toContain('no inventes');
  });

  it('instruye a citar la página de origen', () => {
    const messages = buildPrompt('pregunta', []);
    expect(messages[0].content).toMatch(/p\.\s*12/); // el ejemplo del formato en la instrucción
  });

  it('instruye a responder en el mismo idioma de la pregunta', () => {
    const messages = buildPrompt('pregunta', []);
    expect(messages[0].content).toContain('mismo idioma');
  });

  it('maneja el caso de contexto vacío sin romperse', () => {
    const messages = buildPrompt('pregunta sin contexto', []);

    expect(messages[0].content).toContain('sin contexto disponible');
    expect(messages[1].content).toBe('pregunta sin contexto');
  });
});