import React from 'react';
import type { Metadata } from 'next';
import { CalendarClock, HandCoins, Luggage, ShieldCheck, Star, Wallet } from 'lucide-react';
import { CtaBand, FeatureCard, PageHero, PillLink, Section, SectionHeading } from '@/components/marketing/blocks';

export const metadata: Metadata = {
  title: 'Become a carrier — Relay',
  description: 'Earn from trips you are already taking by carrying sealed packages along your route.',
};

const PERKS = [
  {
    icon: <HandCoins size={20} />,
    title: 'Set your own rate',
    body: 'Choose your price per kilogram for each trip. You see exactly what a request pays before you accept.',
  },
  {
    icon: <Luggage size={20} />,
    title: 'Carry what fits',
    body: 'Declare your spare capacity. Relay only sends requests that fit your route, date and bag.',
  },
  {
    icon: <CalendarClock size={20} />,
    title: 'No schedule changes',
    body: 'You travel when you were going to travel. Handoffs are planned around your trip, not the other way round.',
  },
  {
    icon: <Wallet size={20} />,
    title: 'Paid as you go',
    body: '70% of your fee lands in your wallet at handoff, the rest on delivery. No waiting for month-end.',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Protected',
    body: 'Senders are verified, items are inspected and sealed by you, and disputes are handled by an arbiter.',
  },
  {
    icon: <Star size={20} />,
    title: 'Build a record',
    body: 'Every clean handoff builds your history on the network, so senders choose you first.',
  },
];

export default function Carriers() {
  return (
    <>
      <PageHero
        eyebrow="Become a carrier"
        title="Your trip is already paid for."
        accent="Let it earn"
        body="Driving to Abuja on Tuesday? Flying to Houston on Friday? List the trip, accept the packages that fit, and get paid to carry them."
      >
        <div className="flex flex-wrap gap-3">
          <PillLink href="/carry" arrow>
            List a trip
          </PillLink>
          <PillLink href="/kyc" variant="light">
            Get verified first
          </PillLink>
        </div>
      </PageHero>

      <Section className="pt-0 md:pt-0">
        <div className="grid items-center gap-6 rounded-[28px] bg-accent-signal p-8 md:grid-cols-[1.2fr_1fr] md:p-12">
          <div>
            <p className="text-label-m uppercase tracking-[0.3em] text-harbor-900/60">Example earnings</p>
            <h2 className="mt-3 text-headline-l text-harbor-900">
              5 kg on a flight to Houston at ₦9,000/kg earns ₦45,000.
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-harbor-900 p-5">
              <p className="text-body-s text-white/60">At handoff</p>
              <p className="text-headline-s text-accent-signal">₦31,500</p>
            </div>
            <div className="rounded-2xl bg-harbor-900 p-5">
              <p className="text-body-s text-white/60">On delivery</p>
              <p className="text-headline-s text-white">₦13,500</p>
            </div>
          </div>
        </div>
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="Why carry with Relay" title="Earn on your terms." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PERKS.map((p) => (
            <FeatureCard key={p.title} {...p} />
          ))}
        </div>
      </Section>

      <div className="bg-surface">
        <Section>
          <SectionHeading eyebrow="Requirements" title="What you need" accent="to start." />
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              'Be 18 or older with a valid government ID',
              'NIN or BVN verification for domestic trips',
              'Passport verification for international trips',
              'A smartphone with camera and location for scans and tracking',
              'Willingness to inspect every item before sealing it',
              'Agreement to the carrier obligations in our Terms',
            ].map((r) => (
              <li key={r} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 text-body-m text-text-primary">
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent-signal" />
                {r}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <CtaBand title="Going somewhere soon" body="List your next trip in under two minutes and start receiving requests along your route." />
    </>
  );
}
