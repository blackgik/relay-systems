import React from 'react';
import type { Metadata } from 'next';
import {
  BadgeCheck,
  Camera,
  Lock,
  MessageCircle,
  Navigation,
  QrCode,
  Search,
  Wallet,
} from 'lucide-react';
import { CtaBand, PageHero, Section, SectionHeading } from '@/components/marketing/blocks';

export const metadata: Metadata = {
  title: 'How it works — Relay',
  description: 'From route search to receiver code: how a Relay shipment moves.',
};

const SENDER = [
  {
    icon: <Search size={20} />,
    title: 'Describe and search',
    body: 'Tell us the origin, destination, category, weight and declared value, and add a photo. Relay returns direct and chained routes built from real upcoming trips.',
  },
  {
    icon: <MessageCircle size={20} />,
    title: 'Pick a route and chat',
    body: 'Choose the route that fits your timing. Each carrier gets a request and has 48 hours to accept. Chat with them in-app — numbers stay masked.',
  },
  {
    icon: <Wallet size={20} />,
    title: 'Fund escrow',
    body: 'Once every leg is accepted, pay from your wallet. Carrier fees and the platform fee go into escrow; the insurance premium goes to the cover pool.',
  },
  {
    icon: <Camera size={20} />,
    title: 'Hand off, sealed',
    body: 'Your first carrier inspects the item, seals it in a tamper-evident bag, and shows a QR code. You scan it, confirm the seal ID and take a photo.',
  },
  {
    icon: <Navigation size={20} />,
    title: 'Follow it live',
    body: 'Track the package on the map while it is in custody. At every transfer the next carrier scans, matches the seal and photographs the bag.',
  },
  {
    icon: <BadgeCheck size={20} />,
    title: 'Receiver confirms',
    body: 'Your receiver gets a one-time delivery code. When the final carrier enters it with a photo, escrow releases and the shipment completes.',
  },
];

const CARRIER = [
  { title: 'Get verified', body: 'NIN or BVN for local trips, passport for international ones.' },
  { title: 'List your trip', body: 'Route, date, mode, spare capacity and your price per kg.' },
  { title: 'Accept requests', body: 'Review item, weight and photo. Accept within 48 hours.' },
  { title: 'Inspect and seal', body: 'Check the item, seal the bag, and hand over with a QR scan.' },
  { title: 'Get paid', body: '70% lands at handoff. The remaining 30% lands on delivery.' },
];

export default function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="Six steps,"
        accent="zero guesswork"
        body="Every Relay shipment follows the same audited path. Money is locked before anything moves, and custody only changes hands when the scan, the seal and the photo agree."
      />

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="For senders" title="The journey of a package." />
        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SENDER.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-accent-signal">
                  {s.icon}
                </span>
                <span className="text-headline-m text-border-strong/60">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="text-title-base text-text-primary">{s.title}</h3>
              <p className="text-caption-r text-text-secondary">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <div className="bg-harbor-900">
        <Section>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div className="flex flex-col gap-4">
              <p className="text-label-m uppercase tracking-[0.3em] text-white/50">For carriers</p>
              <h2 className="text-headline-l text-white">
                Turn a trip into income<span className="text-accent-signal">.</span>
              </h2>
              <p className="text-body-l text-white/70">
                You are already going. Relay matches you with packages along your route and pays you in
                two parts, so you are never carrying for free.
              </p>
            </div>
            <ol className="flex flex-col">
              {CARRIER.map((c, i) => (
                <li key={c.title} className="flex gap-5 border-b border-white/10 py-5 last:border-0">
                  <span className="text-title-l text-accent-signal">{i + 1}</span>
                  <div>
                    <p className="text-title-m text-white">{c.title}</p>
                    <p className="text-body-m text-white/70">{c.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Section>
      </div>

      <Section>
        <SectionHeading eyebrow="When things go wrong" title="Plans for the" accent="bad days, too." />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: <Navigation size={20} />,
              title: 'A carrier drops out',
              body: 'The shipment moves to rerouting. You choose a backup route and only the affected leg changes. Funds stay in escrow.',
            },
            {
              icon: <Lock size={20} />,
              title: 'A seal does not match',
              body: 'Escrow freezes on the spot and a dispute opens with a Relay arbiter, who reviews the photos, scans and GPS trail.',
            },
            {
              icon: <QrCode size={20} />,
              title: 'A no-show at handoff',
              body: 'Missed handoffs are logged against the carrier’s record and the shipment is rerouted or refunded.',
            },
          ].map((c) => (
            <div key={c.title} className="flex flex-col gap-3 rounded-2xl bg-surface p-6">
              <span className="text-accent-signal">{c.icon}</span>
              <h3 className="text-title-base text-text-primary">{c.title}</h3>
              <p className="text-caption-r text-text-secondary">{c.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
