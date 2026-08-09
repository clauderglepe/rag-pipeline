import { INestApplication, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AllExceptionsFilter } from "./common/filters/all-exceptions/all-exceptions.filter";


export function setupApp(app: INestApplication) {
   app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // descarta propiedades no declaradas en el DTO
        forbidNonWhitelisted: true, // rechaza la petición si trae propiedades extra, en vez de solo ignorarlas
        transform: true, // convierte tipos primitivos (ej. querystring "5" -> number 5)
      }),
    )
    app.useGlobalFilters(new AllExceptionsFilter());
  
    const swaggerConfig = new DocumentBuilder()
      .setTitle('RAG Pipeline API')
      .setDescription(
        'API del pipeline RAG multi-índice: ingesta de PDF, indexado semántico y ' +
          'léxico, retrieval híbrido (RRF) y generación de respuestas con LLM local.',
      )
      .setVersion('1.0')
      .build();
  
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);

    return app;
}