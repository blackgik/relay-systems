import { redirect } from 'next/navigation';

export default async function ShipmentRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/deliveries/sending/${encodeURIComponent(id)}`);
}
