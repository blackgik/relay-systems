import { BadRequestException } from '@nestjs/common';

// Shipment lifecycle (spec section 8.1). Every transition is validated;
// invalid transitions throw.
export const SHIPMENT_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ROUTED', 'CANCELLED'],
  ROUTED: ['AWAITING_APPROVAL', 'CANCELLED'],
  AWAITING_APPROVAL: ['APPROVED', 'REROUTING', 'CANCELLED'],
  REROUTING: ['AWAITING_APPROVAL', 'CANCELLED'],
  APPROVED: ['FUNDED', 'CANCELLED'],
  FUNDED: ['IN_TRANSIT', 'REFUNDED'],
  IN_TRANSIT: ['IN_TRANSIT', 'DELIVERED', 'DISPUTED'],
  DELIVERED: ['COMPLETED', 'DISPUTED'],
  DISPUTED: ['COMPLETED', 'REFUNDED'],
  COMPLETED: [],
  REFUNDED: [],
  CANCELLED: [],
};

// Leg lifecycle (spec section 8.2).
export const LEG_TRANSITIONS: Record<string, string[]> = {
  PROPOSED: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: ['AWAITING_PICKUP', 'EXPIRED'],
  AWAITING_PICKUP: ['IN_CUSTODY', 'NO_SHOW'],
  IN_CUSTODY: ['HANDED_OFF', 'LOST', 'DISPUTED'],
  HANDED_OFF: ['SETTLED'],
  REJECTED: [],
  EXPIRED: [],
  SETTLED: [],
  NO_SHOW: [],
  LOST: [],
  DISPUTED: [],
};

export function assertTransition(
  map: Record<string, string[]>,
  kind: string,
  from: string,
  to: string
) {
  if (!(map[from] ?? []).includes(to)) {
    throw new BadRequestException(`Invalid ${kind} transition: ${from} -> ${to}`);
  }
}
