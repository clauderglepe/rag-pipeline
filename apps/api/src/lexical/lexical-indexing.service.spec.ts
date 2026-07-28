import { Test, TestingModule } from '@nestjs/testing';
import { LexicalIndexingService } from './lexical-indexing.service';

describe('LexicalIndexingService', () => {
  let service: LexicalIndexingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LexicalIndexingService],
    }).compile();

    service = module.get<LexicalIndexingService>(LexicalIndexingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
