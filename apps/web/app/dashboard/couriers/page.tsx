import { redirect } from 'next/navigation';

// The courier board is part of Send a package now; keep ?q= from old links.
export default async function CourierBoardRedirect({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  redirect(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
}
