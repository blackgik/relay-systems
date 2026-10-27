import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateShipmentDto } from './shipments.dto';

const base = {
  receiverName: 'Ada Lovelace',
  receiverPhone: '+2348000000000',
  originCity: 'Lagos',
  destCity: 'Abuja',
  category: 'Electronics',
  weightKg: 2.5,
  declaredValue: 50000,
  currency: 'NGN',
  photos: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='],
};

async function photoErrors(photos: unknown) {
  const dto = plainToInstance(CreateShipmentDto, { ...base, photos });
  const errors = await validate(dto);
  return errors.filter((e) => e.property === 'photos');
}

describe('CreateShipmentDto photos', () => {
  it('accepts uploaded data-URL photos and hosted https photos', async () => {
    await expect(photoErrors(['data:image/png;base64,iVBORw0KGgo='])).resolves.toHaveLength(0);
    await expect(photoErrors(['data:image/jpeg;base64,/9j/4AAQSkZJRg=='])).resolves.toHaveLength(0);
    await expect(photoErrors(['https://cdn.example.com/package.jpg'])).resolves.toHaveLength(0);
  });

  it('rejects non-image strings', async () => {
    await expect(photoErrors(['not-a-photo'])).resolves.not.toHaveLength(0);
    await expect(photoErrors(['javascript:alert(1)'])).resolves.not.toHaveLength(0);
    await expect(photoErrors(['data:text/html;base64,PHNjcmlwdD4='])).resolves.not.toHaveLength(0);
  });

  it('rejects oversized photo payloads', async () => {
    const huge = `data:image/png;base64,${'A'.repeat(5_600_000)}`;
    await expect(photoErrors([huge])).resolves.not.toHaveLength(0);
  });
});
