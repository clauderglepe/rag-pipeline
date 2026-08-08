import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseFilters,
  ParseFilePipe,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IngestionService } from './ingestion.service';
import { DocumentResponseDto } from './dto/document-response.dto';
import { MulterExceptionFilter } from './multer-exception.filter';
import { ApiOperation, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

@Controller('documents')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  @ApiOperation({ summary: 'Sube un PDF, extrae su texto y lo divide en chunks' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo PDF, máximo 20MB',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Documento ingerido correctamente', type: DocumentResponseDto })
  @ApiResponse({ status: 400, description: 'Tipo de archivo inválido, sin archivo, o PDF sin texto extraíble' })
  @ApiResponse({ status: 413, description: 'Archivo mayor a 20MB' })
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'application/pdf' })],
      }),
    )
    file: Express.Multer.File,
  ): Promise<DocumentResponseDto> {
    return this.ingestionService.ingest(file.buffer);
  }
}
