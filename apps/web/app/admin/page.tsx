import React from 'react';
import Link from 'next/link';
import { Typography } from '@/ui/elements';

export default function AdminHome() {
  return (
    <div className="flex flex-col gap-3">
      <Typography size="headline-m" weight="bold" color="primary" as="h1">
        Operations
      </Typography>
      <Typography size="body-l" color="secondary">
        Dispute queue, KYC review, flagged custody events, and the ledger view. The admin
        console lands after the core sender and carrier flows.
      </Typography>
      <Link href="/admin/kyc" className="w-fit text-body-m font-medium text-text-link hover:underline">
        Review pending KYC submissions →
      </Link>
    </div>
  );
}
