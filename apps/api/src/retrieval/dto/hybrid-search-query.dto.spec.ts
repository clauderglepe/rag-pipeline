import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HybridSearchQueryDto } from './hybrid-search-query.dto';

describe('HybridSearchQueryDto', () => {
  it('aplica topK=5 por defecto si no se envía', async () => {
    const dto = plainToInstance(HybridSearchQueryDto, { query: 'algo' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.topK).toBe(5);
  });

  it('acepta un topK explícito dentro de rango', async () => {
    const dto = plainToInstance(HybridSearchQueryDto, { query: 'algo', topK: 10 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.topK).toBe(10);
  });

  it('rechaza query vacío', async () => {
    const dto = plainToInstance(HybridSearchQueryDto, { query: '' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza query ausente', async () => {
    const dto = plainToInstance(HybridSearchQueryDto, {});
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza topK fuera de rango', async () => {
    const dto = plainToInstance(HybridSearchQueryDto, { query: 'algo', topK: 51 });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza topK no entero', async () => {
    const dto = plainToInstance(HybridSearchQueryDto, { query: 'algo', topK: 1.5 });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});