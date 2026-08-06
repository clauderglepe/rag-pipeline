import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { GenerationModule } from '../generation/generation.module';
import { RetrievalModule } from '../retrieval/retrieval.module';

@Module({
    imports: [RetrievalModule, GenerationModule],
  controllers: [QueryController],
  providers: [QueryService]
})
export class QueryModule {}
