import { Module } from '@nestjs/common';
import { RetrievalController } from './retrieval.controller';
import { RetrievalService } from './retrieval.service';
import { IndexModule } from 'src/index/index.module';
import { LexicalModule } from 'src/lexical/lexical.module';

@Module({
  imports: [IndexModule, LexicalModule],
  controllers: [RetrievalController],
  providers: [RetrievalService]
})
export class RetrievalModule {}
