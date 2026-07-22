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

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

@Controller('documents')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
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