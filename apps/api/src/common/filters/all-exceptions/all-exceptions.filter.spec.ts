import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createMockHost(url = '/documents/xyz/query') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { url };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    // Silenciamos el logger real durante los tests, no lo estamos probando a él.
    jest.spyOn(require('@nestjs/common').Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mapea NotFoundException con la forma estándar', () => {
    const { host, status, json } = createMockHost();

    filter.catch(new NotFoundException('No se encontró el documento "xyz"'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'No se encontró el documento "xyz"',
        error: 'NOT_FOUND',
        path: '/documents/xyz/query',
      }),
    );
  });

  it('mapea ServiceUnavailableException con la forma estándar', () => {
    const { host, status, json } = createMockHost();

    filter.catch(new ServiceUnavailableException('Ollama no disponible'), host);

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 503, error: 'SERVICE_UNAVAILABLE' }),
    );
  });

  it('preserva un array de mensajes de un BadRequestException de validación', () => {
    const { host, json } = createMockHost();

    filter.catch(
      new BadRequestException(['query debe ser un string', 'topK debe ser un entero']),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: ['query debe ser un string', 'topK debe ser un entero'],
      }),
    );
  });

  it('un error no controlado responde 500 con mensaje genérico, sin exponer detalles internos', () => {
    const { host, status, json } = createMockHost();
    const internalError = new Error('conexión falló en el host interno 10.0.0.5');

    filter.catch(internalError, host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe('Error interno del servidor');
    expect(JSON.stringify(body)).not.toContain('10.0.0.5'); // el detalle real nunca llega a la respuesta
  });

  it('incluye path y timestamp válidos en todas las respuestas', () => {
    const { host, json } = createMockHost('/documents/abc/index/semantic');

    filter.catch(new NotFoundException('no existe'), host);

    const body = json.mock.calls[0][0];
    expect(body.path).toBe('/documents/abc/index/semantic');
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });
});