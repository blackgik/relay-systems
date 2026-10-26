import React from 'react';
import Link from 'next/link';
import { Button, Typography } from '@/ui/elements';
import { AppShell } from '@/components/app-shell';

const STEPS = [
  {
    n: '01',
    title: 'Search the route',
    body: 'Enter origin and destination. Relay finds travelers already going your way — direct, or chained across cities.',
  },
  {
    n: '02',
    title: 'Seal and hand off',
    body: 'The carrier inspects and seals your item in a tamper-evident bag. Every handoff is scanned, photographed, and timestamped.',
  },
  {
    n: '03',
    title: 'Delivered and released',
    body: 'Your receiver confirms with a one-time code. Escrow releases to the carriers — holdbacks and insurance included.',
  },
];

export default function Home() {
  return (
    <AppShell>
      <section className="flex max-w-2xl flex-col gap-5 py-10">
        <Typography size="body-m" weight="medium" color="secondary" as="p">
          Peer-to-peer logistics network
        </Typography>
        <Typography size="display-s" weight="bold" color="primary" as="h1">
          Your route is someone&apos;s delivery.
        </Typography>
        <Typography size="body-l" color="secondary" as="p">
          Travelers carry packages along trips they are already taking. No central carrier,
          no consolidation warehouses — just sealed custody from handoff to doorstep.
        </Typography>
        <div className="flex items-center gap-4">
          <Link href="/search">
            <Button label="Send a package" size="lg" />
          </Link>
          <Link href="/carry" className="text-body-m font-medium text-text-brand">
            Carry and earn →
          </Link>
        </div>
      </section>

      <section className="rounded-lg bg-brand px-6 py-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Typography size="title-m" weight="semi-bold" customClassName="text-white" as="p">
            Awka
          </Typography>
          <span className="text-title-m font-bold text-accent-signal" aria-hidden>
            →
          </span>
          <Typography size="title-m" weight="semi-bold" customClassName="text-white" as="p">
            Abuja
          </Typography>
          <span className="text-title-m font-bold text-accent-signal" aria-hidden>
            →
          </span>
          <Typography size="title-m" weight="semi-bold" customClassName="text-white" as="p">
            Houston
          </Typography>
          <Typography size="body-m" customClassName="ml-auto text-white/80" as="p">
            One shipment, two travelers, zero warehouses.
          </Typography>
        </div>
      </section>

      <section className="grid gap-8 py-12 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="flex flex-col gap-2">
            <Typography size="display-xs" weight="bold" customClassName="text-accent-signal" as="p">
              {step.n}
            </Typography>
            <Typography size="title-m" weight="semi-bold" color="primary" as="h2">
              {step.title}
            </Typography>
            <Typography size="body-m" color="secondary" as="p">
              {step.body}
            </Typography>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border py-6">
        {['Escrow on every shipment', 'Sealed chain of custody', '48-hour carrier verification', 'Declared-value insurance'].map(
          (item) => (
            <Typography key={item} size="body-s" weight="medium" color="secondary" as="p">
              {item}
            </Typography>
          )
        )}
      </section>
    </AppShell>
  );
}
