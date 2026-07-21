import { Test, TestingModule } from '@nestjs/testing';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';

describe('IngestionController', () => {
  let controller: IngestionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [IngestionService],
    }).compile();

    controller = module.get<IngestionController>(IngestionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
