import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? this.extractMessage((exception as HttpException).getResponse())
      : 'Error interno del servidor';

    if (!isHttpException) {
        // El detalle real de un error no controlado nunca llega a la respuesta HTTP
        // (ver design.md §4) — pero sí se loguea del lado del servidor, o depurar un
        // 500 real sería imposible.
        this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      }

      const body: ErrorResponseBody = {
        statusCode: status,
        message,
        error: HttpStatus[status] ?? 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      response.status(status).json(body);
        
  }
    
  private extractMessage(exceptionResponse: string | object): string | string[] {

    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      // El ValidationPipe global (tarea 3) lanza BadRequestException con
      // message como array de strings, uno por cada error de validación —
      // se preserva tal cual, no se aplana a un solo string.
      return (exceptionResponse as { message: string | string[] }).message;
    }
    return 'Error';
  }
}
