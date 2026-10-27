import React from 'react';
import type { Metadata } from 'next';
import {
  BadgeCheck,
  Ban,
  Camera,
  Lock,
  MessageCircle,
  Navigation,
  Scale,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { CtaBand, FeatureCard, PageHero, PillLink, Section, SectionHeading } from '@/components/marketing/blocks';

export const metadata: Metadata = {
  title: 'Trust & safety — Relay',
  description: 'Verified identities, sealed custody, escrowed money and human arbitration.',
};

const PILLARS = [
  {
    icon: <BadgeCheck size={20} />,
    title: 'Verified identities',
    body: 'Senders and carriers verify with NIN or BVN. International carriers verify with a passport, plus liveness and travel proof.',
  },
  {
    icon: <Lock size={20} />,
    title: 'Sealed custody',
    body: 'Items are inspected, photographed and sealed in tamper-evident bags. Each seal has a unique ID that is checked at every handoff.',
  },
  {
    icon: <Wallet size={20} />,
    title: 'Escrowed money',
    body: 'Payment is locked before anything moves. Carriers are paid as custody is proven, never upfront.',
  },
  {
    icon: <Navigation size={20} />,
    title: 'Live location',
    body: 'Carriers share location while a package is in their custody, so you always know where it is.',
  },
  {
    icon: <MessageCircle size={20} />,
    title: 'Private by default',
    body: 'All coordination happens in masked chat. Phone numbers and personal addresses are never exposed.',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Insured',
    body: 'Every funded shipment carries declared-value cover, paid into a dedicated insurance pool.',
  },
];

const TIERS = [
  { tier: 'T0', name: 'Unverified', body: 'Browse routes and explore the app.' },
  { tier: 'T1', name: 'National ID', body: 'NIN or BVN verified. Send and carry on domestic routes.' },
  { tier: 'T2', name: 'Passport', body: 'Passport verified. Send and carry internationally.' },
];

export default function Safety() {
  return (
    <>
      <PageHero
        eyebrow="Trust & safety"
        title="Trust is built in,"
        accent="not bolted on"
        body="Handing a package to a stranger only works if the system is stricter than a courier. Relay checks identities, proves custody at every handoff, and holds the money until the receiver says it arrived."
      />

      <Section className="pt-0 md:pt-0">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <FeatureCard key={p.title} {...p} />
          ))}
        </div>
      </Section>

      <div className="bg-surface">
        <Section>
          <div className="grid gap-12 lg:grid-cols-2">
            <SectionHeading
              eyebrow="Verification tiers"
              title="The further it goes,"
              accent="the more we check."
              body="Verification levels only go up, never down. Liveness and travel proof confirm facts about a person without changing their tier."
            />
            <div className="flex flex-col gap-3">
              {TIERS.map((t) => (
                <div key={t.tier} className="flex items-center gap-5 rounded-2xl border border-border bg-card p-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-title-m text-accent-signal">
                    {t.tier}
                  </span>
                  <div>
                    <p className="text-title-m text-text-primary">{t.name}</p>
                    <p className="text-body-m text-text-secondary">{t.body}</p>
                  </div>
                </div>
              ))}
              <PillLink href="/kyc" variant="light" arrow className="mt-3 self-start">
                Get verified
              </PillLink>
            </div>
          </div>
        </Section>
      </div>

      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-[28px] bg-harbor-900 p-8 md:p-10">
            <Scale size={28} className="text-accent-signal" />
            <h2 className="text-headline-m text-white">Disputes, decided by people.</h2>
            <p className="text-body-l text-white/70">
              If a seal does not match, a handoff is contested, or an item arrives damaged, escrow freezes
              and a Relay arbiter reviews the photos, scans, chat and GPS trail. They can release funds,
              refund the sender, or pay out an insurance claim.
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-[28px] border border-border bg-card p-8 md:p-10">
            <Ban size={28} className="text-destructive" />
            <h2 className="text-headline-m text-text-primary">What never travels.</h2>
            <p className="text-body-l text-text-secondary">
              Carriers may refuse any item they are not comfortable with, and must refuse anything on the
              prohibited list — including weapons, drugs, cash, hazardous materials and live animals.
            </p>
            <PillLink href="/terms#prohibited" variant="light" arrow className="mt-auto self-start">
              Full prohibited list
            </PillLink>
          </div>
        </div>
        <div className="mt-6 flex items-start gap-4 rounded-2xl border border-warning-text/20 bg-warning-subtle p-5">
          <Camera size={20} className="mt-0.5 shrink-0 text-warning-text" />
          <p className="text-body-m text-warning-text">
            Never accept a package outside the app, and never skip the seal scan. Handoffs done off-platform
            are not covered by escrow or insurance.
          </p>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
