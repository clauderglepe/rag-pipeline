import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { GenerationModule } from 'src/generation/generation.module';
import { RetrievalModule } from 'src/retrieval/retrieval.module';

@Module({
    imports: [RetrievalModule, GenerationModule],
  controllers: [QueryController],
  providers: [QueryService]
})
export class QueryModule {}
