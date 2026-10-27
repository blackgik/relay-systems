'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MapPin, Package } from 'lucide-react';

// Hero search pill. Hands the cities to /search, which pre-fills its form.
export function RouteSearch() {
  const router = useRouter();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (from.trim()) q.set('from', from.trim());
    if (to.trim()) q.set('to', to.trim());
    router.push(`/search${q.size ? `?${q}` : ''}`);
  };

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-xl items-center gap-1 rounded-full border border-border/70 bg-background p-2 shadow-2lg"
    >
      <label className="flex min-w-0 flex-1 items-center gap-2 pl-3">
        <Package size={18} className="shrink-0 text-accent-signal" />
        <span className="sr-only">Pickup city</span>
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="Pickup city"
          className="w-full min-w-0 border-0 bg-transparent p-0 text-body-m text-text-primary placeholder:text-text-tertiary focus:ring-0"
        />
      </label>
      <span className="h-6 w-px bg-border" aria-hidden />
      <label className="flex min-w-0 flex-1 items-center gap-2 pl-3">
        <MapPin size={18} className="shrink-0 text-icon-brand dark:text-harbor-200" />
        <span className="sr-only">Delivery city</span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Delivery city"
          className="w-full min-w-0 border-0 bg-transparent p-0 text-body-m text-text-primary placeholder:text-text-tertiary focus:ring-0"
        />
      </label>
      <button
        type="submit"
        aria-label="Find a route"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-signal text-harbor-900 transition-transform hover:scale-105"
      >
        <ArrowRight size={18} />
      </button>
    </form>
  );
}
