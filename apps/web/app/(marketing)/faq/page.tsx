import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CtaBand, PageHero, Section } from '@/components/marketing/blocks';

export const metadata: Metadata = {
  title: 'FAQ — Relay',
  description: 'Answers about sending, carrying, payments, safety and disputes on Relay.',
};

const GROUPS = [
  {
    title: 'Sending',
    items: [
      {
        q: 'How does Relay find a route?',
        a: 'We search upcoming trips from verified carriers. If nobody is travelling directly, we chain up to three trips with at least 12 hours between each handoff, and show you every option with its timing and price.',
      },
      {
        q: 'What can I send?',
        a: 'Most everyday items that fit in luggage — fabric, clothing, electronics, documents, books and gifts. Some items are never allowed; see the prohibited list in our Terms.',
      },
      {
        q: 'Who receives the package?',
        a: 'You name a receiver with a phone number. They get a one-time delivery code, which the final carrier must enter to complete the delivery.',
      },
      {
        q: 'What if a carrier cancels?',
        a: 'If a carrier rejects or misses the 48-hour acceptance window, the shipment moves to rerouting and you choose a backup route. Your funds stay in escrow throughout.',
      },
    ],
  },
  {
    title: 'Carrying',
    items: [
      {
        q: 'Do I have to inspect every item?',
        a: 'Yes. Before sealing, you check the item matches its description and photo. You can refuse anything you are not comfortable carrying.',
      },
      {
        q: 'When do I get paid?',
        a: '70% of your leg fee is released when you hand off to the next carrier or receiver and the seal matches. The remaining 30% is released when the shipment is delivered.',
      },
      {
        q: 'What verification do I need?',
        a: 'NIN or BVN (tier T1) for domestic trips, and a passport (tier T2) for international ones.',
      },
    ],
  },
  {
    title: 'Payments & cover',
    items: [
      {
        q: 'What does it cost?',
        a: 'The carriers’ fees, plus a 5% platform fee on those fees, plus a 2% insurance premium on your declared value. You see the full breakdown before you pay.',
      },
      {
        q: 'Where is my money while the package travels?',
        a: 'In escrow. It is released to carriers only as custody is proven, and the platform fee is only collected after delivery.',
      },
      {
        q: 'How does insurance work?',
        a: 'Every funded shipment is covered for its declared value. If an item is lost or damaged in Relay custody, an arbiter reviews the claim and can pay it from the insurance pool.',
      },
    ],
  },
  {
    title: 'Safety & disputes',
    items: [
      {
        q: 'Can carriers see my phone number or address?',
        a: 'No. Coordination happens in masked in-app chat, and pickup details are only shared with the carrier handling that leg.',
      },
      {
        q: 'What happens if a seal does not match?',
        a: 'Escrow freezes immediately and a dispute opens. A Relay arbiter reviews the photos, scans, chat and location trail, then decides how funds are released.',
      },
    ],
  },
];

export default function Faq() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Questions,"
        accent="answered"
        body="Everything you need to know about sending and carrying with Relay. Can’t find it here?"
      >
        <Link href="/contact" className="text-body-l font-medium text-text-link hover:underline dark:text-harbor-200">
          Talk to our team →
        </Link>
      </PageHero>

      <Section className="pt-0 md:pt-0">
        <div className="flex flex-col gap-14">
          {GROUPS.map((g) => (
            <div key={g.title} className="grid gap-6 md:grid-cols-[220px_1fr]">
              <h2 className="text-headline-s text-text-primary">
                {g.title}
                <span className="text-accent-signal">.</span>
              </h2>
              <div className="flex flex-col gap-3">
                {g.items.map((f) => (
                  <details key={f.q} className="group rounded-2xl border border-border bg-card p-5 open:shadow-light">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-title-m text-text-primary">
                      {f.q}
                      <span className="text-title-l text-accent-signal transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 text-caption-r text-text-secondary">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
