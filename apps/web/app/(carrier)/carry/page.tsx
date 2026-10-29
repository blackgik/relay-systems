import React from 'react';
import Link from 'next/link';
import { Typography } from '@/ui/elements';

export default function CarrierHome() {
  return (
    <div className="flex flex-col gap-3">
      <Typography size="headline-m" weight="bold" color="primary" as="h1">
        Carry and earn
      </Typography>
      <Typography size="body-l" color="secondary">
        Post trips you are already taking, inspect and seal items, scan handoffs, and get
        paid from escrow on delivery.
      </Typography>
      <div className="flex flex-wrap gap-6">
        <Link href="/trips" className="text-body-m font-medium text-text-brand">
          My trips →
        </Link>
        <Link href="/trips?new=1" className="text-body-m font-medium text-text-brand">
          Post a trip →
        </Link>
        <Link href="/deliveries/carrying" className="text-body-m font-medium text-text-brand">
          Incoming requests →
        </Link>
      </div>
    </div>
  );
}
