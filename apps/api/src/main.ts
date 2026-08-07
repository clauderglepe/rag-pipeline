import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // descarta propiedades no declaradas en el DTO
    forbidNonWhitelisted: true, // rechaza la petición si trae propiedades extra, en vez de solo ignorarlas
    transform: true, // convierte tipos primitivos (ej. querystring "5" -> number 5)
  }),
)
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
