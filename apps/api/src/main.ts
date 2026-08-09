import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions/all-exceptions.filter';
import { setupApp } from './setup-app';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  setupApp(app);
  await app.listen(3000);
}

bootstrap();
