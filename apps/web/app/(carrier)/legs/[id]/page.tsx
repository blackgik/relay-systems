import { redirect } from 'next/navigation';

// A courier's job is part of its request in Deliveries → Carrying.
export default async function LegRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/deliveries/carrying/${encodeURIComponent(id)}`);
}
