import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HandoffDto, PingDto } from './custody.dto';

async function errorsFor<T extends object>(cls: new () => T, data: Record<string, unknown>) {
  return validate(plainToInstance(cls, data));
}

describe('PingDto coordinates', () => {
  it('accepts real-world coordinates', async () => {
    await expect(
      errorsFor(PingDto, { shipmentId: 'shp_1', lat: 6.5244, lng: 3.3792 })
    ).resolves.toHaveLength(0);
  });

  it('rejects out-of-range latitude and longitude', async () => {
    await expect(errorsFor(PingDto, { shipmentId: 'shp_1', lat: 91, lng: 3.3 })).resolves.not.toHaveLength(0);
    await expect(errorsFor(PingDto, { shipmentId: 'shp_1', lat: 6.5, lng: -181 })).resolves.not.toHaveLength(0);
  });
});

describe('HandoffDto photos', () => {
  const base = { token: 'tok', sealId: 'seal-1', idempotencyKey: 'idem-1' };

  it('accepts data-URL photos', async () => {
    await expect(
      errorsFor(HandoffDto, { ...base, photos: ['data:image/webp;base64,UklGRg=='] })
    ).resolves.toHaveLength(0);
  });

  it('rejects non-image photo strings', async () => {
    const errors = await errorsFor(HandoffDto, { ...base, photos: ['photo.jpg'] });
    expect(errors.some((e) => e.property === 'photos')).toBe(true);
  });
});
