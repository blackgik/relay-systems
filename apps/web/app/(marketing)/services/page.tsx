import React from 'react';
import type { Metadata } from 'next';
import {
  Briefcase,
  FileText,
  Globe,
  HandCoins,
  Heart,
  MessageCircle,
  Navigation,
  Plane,
  Route,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import { CtaBand, FeatureCard, PageHero, PillLink, Section, SectionHeading } from '@/components/marketing/blocks';

export const metadata: Metadata = {
  title: 'Services — Relay',
  description: 'Intercity, international and multi-leg delivery carried by verified travelers.',
};

const CORE = [
  {
    icon: <Truck size={22} />,
    tag: 'Intercity',
    title: 'Road delivery between cities',
    body: 'Travelers driving or riding between cities carry your parcel the same day they leave. Ideal for Awka → Abuja, Lagos → Ibadan and every corridor in between.',
    points: ['Same-trip delivery', 'Up to 30 kg per carrier', 'Low per-kg rates'],
  },
  {
    icon: <Plane size={22} />,
    tag: 'International',
    title: 'Air delivery across borders',
    body: 'Verified flyers with spare luggage allowance carry documents, fashion and electronics to the diaspora — far below courier prices and without customs consolidation delays.',
    points: ['Passport-verified carriers', 'Flight-time tracking', 'Declared-value cover'],
  },
  {
    icon: <Route size={22} />,
    tag: 'Multi-leg',
    title: 'Chained routes',
    body: 'When no one is making your exact trip, Relay stitches together up to three legs with a 12-hour buffer between each handoff — and reroutes automatically if a carrier drops.',
    points: ['Up to 3 legs', 'Automatic rerouting', 'One price, one escrow'],
  },
];

const EXTRAS = [
  {
    icon: <ShieldCheck size={20} />,
    title: 'Declared-value insurance',
    body: 'Every funded shipment is covered for its declared value at a flat 2% premium.',
  },
  {
    icon: <Navigation size={20} />,
    title: 'Live custody tracking',
    body: 'See exactly who holds your package and where, from pickup to the receiver’s door.',
  },
  {
    icon: <MessageCircle size={20} />,
    title: 'Masked chat',
    body: 'Coordinate pickup and handoff in-app. Phone numbers are never shown to either side.',
  },
  {
    icon: <HandCoins size={20} />,
    title: 'Escrow wallet',
    body: 'Top up once and pay for shipments from a wallet. Carriers withdraw earnings from theirs.',
  },
  {
    icon: <FileText size={20} />,
    title: 'Proof of delivery',
    body: 'A one-time receiver code and photo close every shipment, with a full audit trail.',
  },
  {
    icon: <Globe size={20} />,
    title: 'Multi-currency',
    body: 'Quote and pay in naira or dollars. Amounts are tracked to the kobo and the cent.',
  },
];

const AUDIENCES = [
  {
    icon: <Heart size={20} />,
    title: 'Families & diaspora',
    body: 'Send food, fabric, medication and keepsakes to loved ones abroad with someone who is flying anyway.',
  },
  {
    icon: <Store size={20} />,
    title: 'Small businesses',
    body: 'Fashion designers, tailors and online sellers reach customers in other cities without a logistics contract.',
  },
  {
    icon: <Briefcase size={20} />,
    title: 'Professionals',
    body: 'Move contracts, certificates and samples between offices in a sealed, tracked, signed-for bag.',
  },
];

export default function Services() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Delivery, carried by"
        accent="people"
        body="Relay is a network of verified travelers, not a fleet of vans. That lets us serve routes couriers ignore, at prices depots cannot match — with more accountability, not less."
      >
        <div className="flex flex-wrap gap-3">
          <PillLink href="/search" arrow>
            Get a quote
          </PillLink>
          <PillLink href="/pricing" variant="light">
            See pricing
          </PillLink>
        </div>
      </PageHero>

      <Section className="pt-0 md:pt-0">
        <div className="grid gap-6 lg:grid-cols-3">
          {CORE.map((s, i) => (
            <div
              key={s.title}
              className={
                i === 1
                  ? 'flex flex-col gap-4 rounded-[28px] bg-harbor-900 p-8 text-white'
                  : 'flex flex-col gap-4 rounded-[28px] border border-border bg-card p-8'
              }
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-signal text-harbor-900">
                  {s.icon}
                </span>
                <span className={i === 1 ? 'text-label-m uppercase tracking-widest text-white/60' : 'text-label-m uppercase tracking-widest text-text-tertiary'}>
                  {s.tag}
                </span>
              </div>
              <h2 className={i === 1 ? 'text-headline-s text-white' : 'text-headline-s text-text-primary'}>{s.title}</h2>
              <p className={i === 1 ? 'text-caption-r text-white/75' : 'text-caption-r text-text-secondary'}>{s.body}</p>
              <ul className="mt-auto flex flex-col gap-2 pt-4">
                {s.points.map((p) => (
                  <li key={p} className={i === 1 ? 'flex items-center gap-2 text-body-m text-white' : 'flex items-center gap-2 text-body-m text-text-primary'}>
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-signal" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <div className="bg-surface">
        <Section>
          <SectionHeading eyebrow="Included with every shipment" title="The extras are" accent="the standard." />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {EXTRAS.map((e) => (
              <FeatureCard key={e.title} {...e} />
            ))}
          </div>
        </Section>
      </div>

      <Section>
        <SectionHeading eyebrow="Who uses Relay" title="Built for the trips" accent="that matter to you." />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <FeatureCard key={a.title} {...a} />
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
