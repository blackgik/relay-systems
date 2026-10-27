import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListTripsQueryDto } from './trips.dto';

async function errorsFor(data: Record<string, unknown>) {
  return validate(plainToInstance(ListTripsQueryDto, data));
}

describe('ListTripsQueryDto', () => {
  it('accepts a well-formed search', async () => {
    await expect(
      errorsFor({ origin: 'Lagos', dest: 'Abuja', from: '2026-11-01T00:00:00Z', to: '2026-11-30T00:00:00Z', mine: 'true' })
    ).resolves.toHaveLength(0);
  });

  it('accepts an empty search', async () => {
    await expect(errorsFor({})).resolves.toHaveLength(0);
  });

  it('rejects non-ISO date filters', async () => {
    await expect(errorsFor({ from: 'next friday' })).resolves.not.toHaveLength(0);
    await expect(errorsFor({ to: '32/13/2026' })).resolves.not.toHaveLength(0);
  });

  it('rejects a mine flag that is not true/false', async () => {
    await expect(errorsFor({ mine: 'yes' })).resolves.not.toHaveLength(0);
  });
});
