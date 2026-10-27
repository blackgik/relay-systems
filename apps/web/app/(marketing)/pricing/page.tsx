import React from 'react';
import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { CtaBand, PageHero, PillLink, Section, SectionHeading } from '@/components/marketing/blocks';

export const metadata: Metadata = {
  title: 'Pricing — Relay',
  description: 'Transparent pricing: carrier fees, a 5% platform fee and 2% declared-value cover.',
};

const PARTS = [
  {
    label: 'Carrier fees',
    value: 'Set per kg',
    body: 'Each carrier sets a price per kilogram for their trip. A leg costs that rate times your package weight.',
  },
  {
    label: 'Platform fee',
    value: '5%',
    body: 'Of the total carrier fees. Held in escrow and only collected once your package is delivered.',
  },
  {
    label: 'Insurance',
    value: '2%',
    body: 'Of your declared value. Covers the item for that full amount while it is in Relay custody.',
  },
];

const EXAMPLE = [
  { label: 'Leg 1 · Road, Awka → Abuja', detail: '5 kg × ₦2,000', amount: '₦10,000' },
  { label: 'Leg 2 · Air, Abuja → Houston', detail: '5 kg × ₦9,000', amount: '₦45,000' },
  { label: 'Platform fee', detail: '5% of ₦55,000', amount: '₦2,750' },
  { label: 'Insurance premium', detail: '2% of ₦150,000 declared', amount: '₦3,000' },
];

const PAYOUT = [
  { when: 'At handoff', share: '70%', body: 'Released to the carrier the moment the next person scans and the seal matches.' },
  { when: 'On delivery', share: '30%', body: 'Released when the receiver’s code is entered at the destination.' },
];

export default function Pricing() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Pay for the trip,"
        accent="not the warehouse"
        body="No subscriptions, no hidden surcharges, no depot fees. You pay what the carriers charge, a small platform fee, and cover for what you declare — all shown before you fund."
      />

      <Section className="pt-0 md:pt-0">
        <div className="grid gap-5 md:grid-cols-3">
          {PARTS.map((p) => (
            <div key={p.label} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-7">
              <p className="text-label-l text-text-tertiary">{p.label}</p>
              <p className="text-numeric-xl text-text-primary">
                {p.value}
              </p>
              <p className="text-caption-r text-text-secondary">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="bg-surface">
        <Section>
          <div className="grid gap-12 lg:grid-cols-2">
            <SectionHeading
              eyebrow="Worked example"
              title="5 kg of fabric,"
              accent="Awka to Houston."
              body="A real chained route from our demo network: one road leg, one air leg, ₦150,000 declared value."
            />
            <div className="rounded-[28px] border border-border bg-card p-6 md:p-8">
              <ul className="flex flex-col divide-y divide-border">
                {EXAMPLE.map((row) => (
                  <li key={row.label} className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="text-title-s text-text-primary">{row.label}</p>
                      <p className="text-body-s text-text-tertiary">{row.detail}</p>
                    </div>
                    <p className="text-title-m text-text-primary">{row.amount}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-center justify-between rounded-2xl bg-harbor-900 px-5 py-4">
                <p className="text-title-m text-white">You pay</p>
                <p className="text-headline-s text-accent-signal">₦60,750</p>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <Section>
        <SectionHeading eyebrow="For carriers" title="Paid in two parts," accent="never at risk." />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {PAYOUT.map((p) => (
            <div key={p.when} className="flex items-start gap-6 rounded-2xl border border-border bg-card p-7">
              <p className="text-numeric-xl text-accent-signal">{p.share}</p>
              <div>
                <p className="text-title-base text-text-primary">{p.when}</p>
                <p className="mt-1 text-caption-r text-text-secondary">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['No listing fees', 'No monthly plan', 'Refunds return to your wallet', 'Fees shown before you pay'].map((t) => (
            <li key={t} className="flex items-center gap-2 text-body-m text-text-secondary">
              <Check size={16} className="text-success-text" /> {t}
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <PillLink href="/search" arrow>
            Get your quote
          </PillLink>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
