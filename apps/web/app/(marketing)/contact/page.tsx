import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, Mail, MapPin, MessageCircle, Scale } from 'lucide-react';
import { PageHero, Section } from '@/components/marketing/blocks';

export const metadata: Metadata = {
  title: 'Contact — Relay',
  description: 'Get help with a shipment, a trip, a dispute or a partnership.',
};

const CHANNELS = [
  {
    icon: <MessageCircle size={20} />,
    title: 'Help with a shipment',
    body: 'Questions about an active shipment are fastest in the in-app chat on that shipment’s page.',
    action: { label: 'support@relay.example', href: 'mailto:support@relay.example' },
  },
  {
    icon: <Scale size={20} />,
    title: 'Disputes & claims',
    body: 'Seal mismatch, damage or a missing item? Open a dispute from the shipment — an arbiter will review it.',
    action: { label: 'disputes@relay.example', href: 'mailto:disputes@relay.example' },
  },
  {
    icon: <Briefcase size={20} />,
    title: 'Business & partnerships',
    body: 'Sending regularly, or want to partner as a hub, airline or retailer? Let’s talk.',
    action: { label: 'partners@relay.example', href: 'mailto:partners@relay.example' },
  },
  {
    icon: <Mail size={20} />,
    title: 'Press',
    body: 'Media enquiries, interviews and brand assets.',
    action: { label: 'press@relay.example', href: 'mailto:press@relay.example' },
  },
];

export default function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We are"
        accent="one message away"
        body="Whether you are mid-shipment or just curious, pick the channel that fits and a real person will get back to you."
      />

      <Section className="pt-0 md:pt-0">
        <div className="grid gap-5 md:grid-cols-2">
          {CHANNELS.map((c) => (
            <div key={c.title} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle text-icon-brand dark:text-accent-signal">
                {c.icon}
              </span>
              <h2 className="text-title-base text-text-primary">{c.title}</h2>
              <p className="text-caption-r text-text-secondary">{c.body}</p>
              <a href={c.action.href} className="mt-auto pt-2 text-body-m font-semi-bold text-text-link hover:underline dark:text-harbor-200">
                {c.action.label}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 rounded-[28px] bg-harbor-900 p-8 md:grid-cols-2 md:p-10">
          <div className="flex flex-col gap-3">
            <MapPin size={24} className="text-accent-signal" />
            <h2 className="text-headline-s text-white">Where we operate</h2>
            <p className="text-body-m text-white/70">
              Relay currently serves domestic routes across Nigeria and international corridors to the
              United States and the United Kingdom, with new routes opening as carriers join.
            </p>
          </div>
          <div className="flex flex-wrap content-start gap-2">
            {['Awka', 'Abuja', 'Lagos', 'Enugu', 'Port Harcourt', 'Houston', 'London'].map((city) => (
              <span key={city} className="rounded-full border border-white/20 px-4 py-2 text-body-m text-white">
                {city}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-10 text-body-m text-text-secondary">
          Looking for quick answers? Start with our{' '}
          <Link href="/faq" className="font-medium text-text-link hover:underline dark:text-harbor-200">
            FAQ
          </Link>
          .
        </p>
      </Section>
    </>
  );
}
