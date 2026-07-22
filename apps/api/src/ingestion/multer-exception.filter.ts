import { ArgumentsHost, Catch, ExceptionFilter, PayloadTooLargeException } from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if(exception.code === 'LIMIT_FILE_SIZE'){
      const tooLarge = new PayloadTooLargeException(
        'El archivo supera el tamaño máximo permitido (20MB)',
      );
      return response.status(tooLarge.getStatus()).json(tooLarge.getResponse());
    }
  }
}
