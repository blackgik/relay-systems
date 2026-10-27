import React from 'react';
import type { Metadata } from 'next';
import { Globe, Heart, Leaf, Users } from 'lucide-react';
import { CtaBand, FeatureCard, PageHero, Section, SectionHeading } from '@/components/marketing/blocks';

export const metadata: Metadata = {
  title: 'About us — Relay',
  description: 'Why we are building a logistics network out of people who are already travelling.',
};

const VALUES = [
  {
    icon: <Users size={20} />,
    title: 'People first',
    body: 'The network is the people in it. We design for the sender who is nervous and the carrier who is doing them a favour.',
  },
  {
    icon: <Heart size={20} />,
    title: 'Proof over promises',
    body: 'Every claim on Relay is backed by a scan, a seal, a photo or a ledger entry. Trust is earned one handoff at a time.',
  },
  {
    icon: <Globe size={20} />,
    title: 'Local to global',
    body: 'We start with the corridors our communities actually use — between Nigerian cities and out to the diaspora.',
  },
  {
    icon: <Leaf size={20} />,
    title: 'Lighter footprint',
    body: 'A package riding in a seat that was already booked adds almost nothing. No extra vans, no empty return trips.',
  },
];

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Your route is"
        accent="someone's delivery"
        body="Every day, thousands of people travel between the same cities their neighbours need to send things to. Relay connects the two — and builds the trust layer that makes it safe."
      />

      <Section className="pt-0 md:pt-0">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-5 text-body-l text-text-secondary">
            <h2 className="text-headline-l text-text-primary">Why we started.</h2>
            <p>
              Sending a parcel from Awka to Houston usually means a courier counter, a consolidation
              warehouse, weeks of waiting and a bill that costs more than the item. Meanwhile, someone
              from the same street is flying out on Friday with half a suitcase empty.
            </p>
            <p>
              People have always asked travelling friends to carry things. What was missing was the
              part that makes it work between strangers: verified identity, a sealed chain of custody,
              money that only moves when delivery is proven, and someone to call when it goes wrong.
            </p>
            <p>That is what Relay is. A logistics network with no fleet — just people, routes and proof.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 self-start">
            {[
              { k: 'No', v: 'warehouses' },
              { k: 'No', v: 'fleet' },
              { k: '3', v: 'legs per route, max' },
              { k: '1', v: 'escrow per shipment' },
            ].map((s, i) => (
              <div
                key={s.v}
                className={i === 0 ? 'rounded-2xl bg-harbor-900 p-6' : 'rounded-2xl border border-border bg-card p-6'}
              >
                <p className={i === 0 ? 'text-numeric-xl text-accent-signal' : 'text-numeric-xl text-text-primary'}>{s.k}</p>
                <p className={i === 0 ? 'text-body-m text-white/70' : 'text-body-m text-text-secondary'}>{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <div className="bg-surface">
        <Section>
          <SectionHeading eyebrow="What we believe" title="The values that" accent="ship with every package." />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <FeatureCard key={v.title} {...v} />
            ))}
          </div>
        </Section>
      </div>

      <Section>
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="max-w-3xl text-headline-m text-text-primary md:text-[36px] md:leading-[46px]">
            “We are not building another courier. We are building the trust layer that lets anyone
            become one<span className="text-accent-signal">.</span>”
          </p>
          <p className="text-body-m text-text-tertiary">The Relay team</p>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
