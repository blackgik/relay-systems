import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BoardQueryDto } from './people.dto';

async function errorsFor(data: Record<string, unknown>) {
  return validate(plainToInstance(BoardQueryDto, data, { enableImplicitConversion: true }));
}

describe('BoardQueryDto', () => {
  it('accepts the filters the web board sends', async () => {
    await expect(errorsFor({ q: 'swift', phase: 'accepting', take: '60' })).resolves.toHaveLength(0);
    await expect(errorsFor({})).resolves.toHaveLength(0);
  });

  it('rejects unknown phases, non-numeric and out-of-range take', async () => {
    await expect(errorsFor({ phase: 'flying' })).resolves.not.toHaveLength(0);
    await expect(errorsFor({ take: 'lots' })).resolves.not.toHaveLength(0);
    await expect(errorsFor({ take: '0' })).resolves.not.toHaveLength(0);
    await expect(errorsFor({ take: '500' })).resolves.not.toHaveLength(0);
  });
});
