import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryRequestDto } from './query-request.dto';

describe('QueryRequestDto', () => {
  it('preserva el query tal cual, sin recortar espacios', () => {
    const dto = plainToInstance(QueryRequestDto, { query: '  ¿qué es EC2?  ' });

    expect(dto.query).toBe('  ¿qué es EC2?  '); // exactamente igual, sin trim
  });

  it('valida sin errores un query no vacío', async () => {
    const dto = plainToInstance(QueryRequestDto, { query: 'algo' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rechaza query vacío', async () => {
    const dto = plainToInstance(QueryRequestDto, { query: '' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza query de solo espacios (a diferencia de @IsNotEmpty, que lo aceptaría)', async () => {
    const dto = plainToInstance(QueryRequestDto, { query: '   ' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza query ausente', async () => {
    const dto = plainToInstance(QueryRequestDto, {});
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza query no string', async () => {
    const dto = plainToInstance(QueryRequestDto, { query: 123 });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});