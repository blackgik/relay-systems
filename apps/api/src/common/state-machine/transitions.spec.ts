import { BadRequestException } from '@nestjs/common';
import {
  LEG_TRANSITIONS,
  SHIPMENT_TRANSITIONS,
  assertTransition,
} from './transitions';

describe('assertTransition', () => {
  it('allows the happy-path shipment lifecycle', () => {
    const path = ['DRAFT', 'ROUTED', 'AWAITING_APPROVAL', 'APPROVED', 'FUNDED', 'IN_TRANSIT'];
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(() =>
        assertTransition(SHIPMENT_TRANSITIONS, 'shipment', path[i], path[i + 1])
      ).not.toThrow();
    }
  });

  it('allows rerouting and disputes', () => {
    expect(() =>
      assertTransition(SHIPMENT_TRANSITIONS, 'shipment', 'AWAITING_APPROVAL', 'REROUTING')
    ).not.toThrow();
    expect(() =>
      assertTransition(SHIPMENT_TRANSITIONS, 'shipment', 'DELIVERED', 'DISPUTED')
    ).not.toThrow();
    expect(() =>
      assertTransition(SHIPMENT_TRANSITIONS, 'shipment', 'IN_TRANSIT', 'IN_TRANSIT')
    ).not.toThrow();
  });

  it('rejects illegal shipment jumps', () => {
    expect(() =>
      assertTransition(SHIPMENT_TRANSITIONS, 'shipment', 'DRAFT', 'FUNDED')
    ).toThrow(BadRequestException);
    expect(() =>
      assertTransition(SHIPMENT_TRANSITIONS, 'shipment', 'COMPLETED', 'DISPUTED')
    ).toThrow(BadRequestException);
  });

  it('allows the happy-path leg lifecycle', () => {
    const path = ['PROPOSED', 'ACCEPTED', 'AWAITING_PICKUP', 'IN_CUSTODY', 'HANDED_OFF', 'SETTLED'];
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(() => assertTransition(LEG_TRANSITIONS, 'leg', path[i], path[i + 1])).not.toThrow();
    }
  });

  it('rejects illegal leg jumps', () => {
    expect(() => assertTransition(LEG_TRANSITIONS, 'leg', 'PROPOSED', 'SETTLED')).toThrow(
      BadRequestException
    );
    expect(() => assertTransition(LEG_TRANSITIONS, 'leg', 'REJECTED', 'ACCEPTED')).toThrow(
      BadRequestException
    );
  });
});
