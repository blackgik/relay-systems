import { redirect } from 'next/navigation';

// Tracking now lives on the shipment page itself.
export default async function TrackingRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/shipments/${id}`);
}
