import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AttestationsService } from './attestations.service';
import { STATEMENT_VERSION, statementHash } from './attestation.statement';

function shipment(overrides: any = {}) {
  const person = (id: string, fullName: string, handle: string) => ({ id, fullName, handle, kycTier: 'T2', kycProfile: null });
  return {
    id: 'sh1',
    senderId: 'sender',
    originCity: 'Awka',
    destCity: 'Abuja',
    category: 'fabric',
    weightKg: 2,
    declaredValue: 100,
    currency: 'NGN',
    sealId: null,
    status: 'FUNDED',
    createdAt: new Date('2026-10-20T10:00:00Z'),
    sender: person('sender', 'Ada Okafor', 'harbor-heron-21'),
    attestation: {
      reference: 'RLY-DEC-0000ABCD',
      signedAt: new Date('2026-10-20T10:01:00Z'),
      signedName: 'Ada Okafor',
      statementVersion: STATEMENT_VERSION,
      statementHash: statementHash(),
    },
    legs: [
      {
        sequence: 0,
        status: 'ACCEPTED',
        trip: {
          originCity: 'Awka',
          destCity: 'Abuja',
          departAt: new Date('2026-10-22T08:00:00Z'),
          mode: 'ROAD',
          flightNumber: 'BUS-12',
          carrier: person('courier', 'Chika Eze', 'willow-raven-90'),
        },
      },
    ],
    ...overrides,
  };
}

function build(found: any) {
  const prisma: any = { shipment: { findUnique: jest.fn().mockResolvedValue(found) } };
  return new AttestationsService(prisma);
}

describe('AttestationsService.forShipment', () => {
  it('gives the sender and the courier the same document, with both full names', async () => {
    const service = build(shipment());
    const asSender = await service.forShipment('sh1', 'sender');
    const asCourier = await service.forShipment('sh1', 'courier');
    expect(asSender.viewerRole).toBe('SENDER');
    expect(asCourier.viewerRole).toBe('COURIER');
    for (const doc of [asSender, asCourier]) {
      expect(doc.sender.fullName).toBe('Ada Okafor');
      expect(doc.couriers[0]).toMatchObject({ fullName: 'Chika Eze', acknowledged: true, reference: 'BUS-12' });
      expect(doc.statementCurrent).toBe(true);
    }
  });

  it('refuses anyone who is not a party to the shipment', async () => {
    await expect(build(shipment()).forShipment('sh1', 'stranger')).rejects.toThrow(ForbiddenException);
  });

  it('shows a courier who has not accepted yet as pending', async () => {
    const doc = await build(shipment({ legs: [{ ...shipment().legs[0], status: 'PROPOSED' }] })).forShipment('sh1', 'courier');
    expect(doc.couriers[0].acknowledged).toBe(false);
  });

  it('404s when nothing was signed', async () => {
    await expect(build(shipment({ attestation: null })).forShipment('sh1', 'sender')).rejects.toThrow(NotFoundException);
  });
});
