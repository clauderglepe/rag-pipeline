import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IngestionModule } from './ingestion/ingestion.module';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { IndexModule } from './index/index.module';
import { LexicalModule } from './lexical/lexical.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    IngestionModule,
    IndexModule,
    LexicalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
