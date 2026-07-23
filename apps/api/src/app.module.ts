import { ConfigurableModuleBuilder, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IngestionModule } from './ingestion/ingestion.module';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:true,
      validate,
    }),
    IngestionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
