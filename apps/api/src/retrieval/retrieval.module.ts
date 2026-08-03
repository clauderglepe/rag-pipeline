import { Module } from '@nestjs/common';
import { RetrievalController } from './retrieval.controller';
import { RetrievalService } from './retrieval.service';
import { IndexModule } from '../index/index.module';
import { LexicalModule } from '../lexical/lexical.module';

@Module({
  imports: [IndexModule, LexicalModule],
  controllers: [RetrievalController],
  providers: [RetrievalService],
  exports: [RetrievalService]
})
export class RetrievalModule {}
