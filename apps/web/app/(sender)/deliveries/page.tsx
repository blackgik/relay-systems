'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardMode } from '@/components/dashboard/shell';

// /deliveries opens the side you were last on: Carrying in courier mode, else Sending.
export default function DeliveriesIndex() {
  const router = useRouter();
  const { mode } = useDashboardMode();
  useEffect(() => {
    router.replace(mode === 'courier' ? '/deliveries/carrying' : '/deliveries/sending');
  }, [mode, router]);
  return <div className="h-[480px] animate-pulse rounded-[22px] bg-muted" aria-label="Loading deliveries" />;
}
