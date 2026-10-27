import React from 'react';
import Link from 'next/link';
import { HeroScene } from '@/components/marketing/hero-scene';
import { Wordmark } from '@/components/marketing/blocks';

// Split auth card: brand panel with the hub illustration on the left, the
// form on the right. The panel hides on small screens.
export function AuthShell({
  title,
  subtitle,
  panelTitle = 'Every handoff sealed. Every naira escrowed.',
  panelBody = 'Send and carry along the routes people already travel — with verified identities on both ends.',
  children,
}: {
  title: string;
  subtitle: React.ReactNode;
  panelTitle?: string;
  panelBody?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-20 -top-24 h-[380px] w-[380px] rounded-full bg-accent-signal/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-[420px] w-[420px] rounded-full bg-brand-subtle blur-3xl dark:opacity-40" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-card p-3 shadow-2lg md:grid-cols-[1fr_1.05fr] md:p-5">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent-signal/20 blur-3xl" />

        <aside className="relative hidden flex-col overflow-hidden rounded-[26px] bg-harbor-900 p-10 md:flex">
          <h2 className="text-headline-l text-white">
            {panelTitle}
          </h2>
          <p className="mt-4 max-w-sm text-body-m text-white/75">{panelBody}</p>
          <div className="relative -mx-6 mt-auto pt-8">
            <div className="absolute inset-x-10 bottom-6 h-40 rounded-full bg-harbor-400/40 blur-3xl" />
            <HeroScene compact />
          </div>
        </aside>

        <main className="relative flex flex-col px-4 py-8 sm:px-10 md:py-12">
          <Link href="/" aria-label="Relay home" className="mx-auto">
            <Wordmark className="text-[30px]" />
          </Link>
          <h1 className="mt-5 text-center text-headline-l text-text-primary">{title}</h1>
          <p className="mt-2 text-center text-body-m text-text-tertiary">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
