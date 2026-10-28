'use client';

import { useParams } from 'next/navigation';
import { ShipmentsWorkspace } from '@/components/shipments/workspace';

export default function ShipmentPage() {
  const { id } = useParams<{ id: string }>();
  return <ShipmentsWorkspace selectedId={id} />;
}
