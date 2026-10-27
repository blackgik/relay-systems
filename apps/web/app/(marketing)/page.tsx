import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Boxes,
  Camera,
  FileText,
  HandCoins,
  Laptop,
  Lock,
  MessageCircle,
  Navigation,
  Plane,
  QrCode,
  Route,
  ShieldCheck,
  Shirt,
  Truck,
} from 'lucide-react';
import { HeroScene } from '@/components/marketing/hero-scene';
import { RouteSearch } from '@/components/marketing/route-search';
import {
  CtaBand,
  Eyebrow,
  FeatureCard,
  Glow,
  PillLink,
  Section,
  SectionHeading,
} from '@/components/marketing/blocks';

const STATS = [
  { value: '3 legs', label: 'Max hops per route' },
  { value: '48h', label: 'Carrier acceptance window' },
  { value: '2%', label: 'Declared-value cover' },
  { value: '100%', label: 'Escrowed payments' },
];

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

const SERVICES = [
  {
    icon: <Route size={20} />,
    title: 'Multi-leg routing',
    body: 'No direct traveler? Relay chains up to three trips, with a 12-hour buffer between handoffs.',
  },
  {
    icon: <Plane size={20} />,
    title: 'International by air',
    body: 'Diaspora corridors like Abuja → Houston, carried in a verified traveler’s luggage.',
  },
  {
    icon: <Truck size={20} />,
    title: 'Intercity by road',
    body: 'Daily road trips between cities move parcels faster than a depot ever could.',
  },
  {
    icon: <HandCoins size={20} />,
    title: 'Carry and earn',
    body: 'List a trip you are already taking. Get paid 70% on handoff, the rest on delivery.',
  },
];

const CUSTODY = [
  { icon: <Camera size={18} />, title: 'Inspected', body: 'Carrier photographs the item before sealing.' },
  { icon: <Lock size={18} />, title: 'Sealed', body: 'Tamper-evident bag with a unique seal ID.' },
  { icon: <QrCode size={18} />, title: 'Scanned', body: 'Each handoff is a QR scan plus seal match.' },
  { icon: <Navigation size={18} />, title: 'Tracked', body: 'Live GPS while the package is in custody.' },
  { icon: <BadgeCheck size={18} />, title: 'Confirmed', body: 'Receiver code releases escrow.' },
];

const CATEGORIES = [
  { icon: <Shirt size={16} />, label: 'Fabric & fashion' },
  { icon: <Laptop size={16} />, label: 'Electronics' },
  { icon: <FileText size={16} />, label: 'Documents' },
  { icon: <BookOpen size={16} />, label: 'Books' },
  { icon: <Boxes size={16} />, label: 'Gifts & everyday items' },
];

const FAQ = [
  {
    q: 'What if my carrier cancels?',
    a: 'If a carrier rejects or misses the 48-hour window, the shipment flips to rerouting and you pick a backup route. Your money never leaves escrow until a leg is actually carried.',
  },
  {
    q: 'Can carriers see my phone number?',
    a: 'No. You chat with carriers inside Relay and phone numbers stay masked on both sides.',
  },
  {
    q: 'What happens if the seal does not match?',
    a: 'Escrow freezes immediately and a dispute opens with a Relay arbiter, who reviews the photos, scans and GPS trail.',
  },
];

export default function Home() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <Glow />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-32 md:pt-40 lg:grid-cols-[1fr_1.1fr] lg:gap-4">
          <div className="flex flex-col gap-6">
            <Eyebrow>Delivering along routes people already travel</Eyebrow>
            <h1 className="text-[40px] font-extra-bold leading-[1.04] tracking-tight text-text-primary xs:text-[46px] sm:text-[64px] lg:text-[58px] xl:text-[66px]">
              Send anything.
              <br />
              <span className="whitespace-nowrap text-harbor-400 dark:text-harbor-200">Along any route</span>
              <span className="text-accent-signal">.</span>
            </h1>
            <p className="max-w-md text-body-l text-text-secondary">
              Travelers carry packages on trips they are already taking. Sealed custody, escrowed
              payment and live tracking — from your doorstep to theirs, across the city or across
              the ocean.
            </p>
            <RouteSearch />
            <dl className="mt-4 grid grid-cols-2 gap-y-6 sm:grid-cols-4">
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex flex-col-reverse justify-end ${i > 0 ? 'sm:border-l sm:border-border sm:pl-5' : ''}`}
                >
                  <dt className="text-body-s text-text-tertiary">{s.label}</dt>
                  <dd className="text-headline-s text-text-primary">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroScene />
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <div className="border-y border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5">
          {['Escrow on every shipment', 'Sealed chain of custody', '48-hour carrier verification', 'Masked in-app chat', 'Declared-value insurance'].map(
            (item) => (
              <span key={item} className="flex items-center gap-2 text-body-m text-text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-signal" />
                {item}
              </span>
            )
          )}
        </div>
      </div>

      {/* ── A real route ────────────────────────────────────────────────── */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <SectionHeading
            eyebrow="One shipment, two travelers"
            title="Zero warehouses."
            accent="Just people on the move."
            body="Ada in Awka sends handmade fabric to her sister in Houston. No single traveler makes that trip — so Relay chains two who already are."
          />
          <div className="rounded-[28px] bg-harbor-900 p-6 md:p-8">
            <div className="flex items-center gap-3 text-title-l text-white">
              Awka <ArrowRight size={18} className="text-accent-signal" /> Abuja{' '}
              <ArrowRight size={18} className="text-accent-signal" /> Houston
            </div>
            <div className="mt-6 flex flex-col gap-3">
              {[
                { icon: <Truck size={18} />, leg: 'Leg 1 · Road', who: 'Chika', when: 'Departs Tuesday', route: 'Awka → Abuja' },
                { icon: <Plane size={18} />, leg: 'Leg 2 · Air', who: 'Bola', when: 'Departs Friday', route: 'Abuja → Houston' },
              ].map((l) => (
                <div key={l.leg} className="flex items-center gap-4 rounded-2xl bg-white/[0.06] p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-signal text-harbor-900">
                    {l.icon}
                  </span>
                  <div className="flex-1">
                    <p className="text-label-m uppercase tracking-wider text-white/60">{l.leg}</p>
                    <p className="text-title-m text-white">
                      {l.route} <span className="text-white/60">with {l.who}</span>
                    </p>
                  </div>
                  <span className="hidden text-body-s text-white/60 sm:block">{l.when}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-body-s text-white/70">
              <span>5 kg · declared ₦150,000</span>
              <span>Insured</span>
              <span>Handoff in Abuja with 12h buffer</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <Section className="pt-0 md:pt-0">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading eyebrow="How it works" title="Three steps from" accent="handoff to doorstep." />
          <PillLink href="/how-it-works" variant="light" arrow>
            See the full journey
          </PillLink>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
              <span className="text-display-xs text-accent-signal">{step.n}</span>
              <h3 className="text-title-base text-text-primary">{step.title}</h3>
              <p className="text-caption-r text-text-secondary">{step.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Services ────────────────────────────────────────────────────── */}
      <div className="bg-surface">
        <Section>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Services"
              title="More than delivery."
              body="Relay is a network, not a fleet. That means routes no courier serves, prices no depot can match, and income for the people carrying."
            />
            <PillLink href="/services" variant="light" arrow>
              All services
            </PillLink>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <FeatureCard key={s.title} {...s} />
            ))}
          </div>
        </Section>
      </div>

      {/* ── Senders vs carriers ─────────────────────────────────────────── */}
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-5 rounded-[28px] border border-border bg-card p-8 md:p-10">
            <Eyebrow>For senders</Eyebrow>
            <h3 className="text-headline-m text-text-primary">Ship with the confidence of a courier, at the price of a favour.</h3>
            <ul className="flex flex-col gap-3 text-body-m text-text-secondary">
              {['Pay once — funds sit in escrow until delivery', 'Watch every handoff with photos and GPS', 'Chat with carriers without sharing your number'].map((t) => (
                <li key={t} className="flex gap-3">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-success-text" />
                  {t}
                </li>
              ))}
            </ul>
            <PillLink href="/search" arrow className="mt-auto self-start">
              Send a package
            </PillLink>
          </div>
          <div className="relative flex flex-col gap-5 overflow-hidden rounded-[28px] bg-accent-signal p-8 md:p-10">
            <Eyebrow className="text-harbor-900/70">For carriers</Eyebrow>
            <h3 className="text-headline-m text-harbor-900">Your trip is already paid for. Let your luggage space earn.</h3>
            <ul className="flex flex-col gap-3 text-body-m text-harbor-900/80">
              {['70% of your fee lands the moment you hand off', 'Accept only the requests that fit your bag', 'Verified senders, inspected items, sealed bags'].map((t) => (
                <li key={t} className="flex gap-3">
                  <HandCoins size={18} className="mt-0.5 shrink-0 text-harbor-900" />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/carriers"
              className="mt-auto inline-flex h-11 items-center gap-2 self-start rounded-full bg-harbor-900 px-5 text-label-l font-semi-bold text-white hover:bg-harbor-800"
            >
              Become a carrier <ArrowRight size={16} className="text-accent-signal" />
            </Link>
          </div>
        </div>
      </Section>

      {/* ── Chain of custody ────────────────────────────────────────────── */}
      <div className="bg-surface">
        <Section>
          <SectionHeading
            center
            eyebrow="Trust & safety"
            title="Every handoff leaves a trail."
            body="Relay never takes your word — or the carrier's — for it. Custody moves only when the scan, the seal and the photo all agree."
          />
          <ol className="relative mt-14 grid gap-6 md:grid-cols-5">
            <span aria-hidden className="absolute left-[10%] right-[10%] top-6 hidden border-t-2 border-dashed border-border-strong/50 md:block" />
            {CUSTODY.map((c) => (
              <li key={c.title} className="relative flex flex-col items-center gap-3 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-surface bg-brand text-accent-signal">
                  {c.icon}
                </span>
                <p className="text-title-m text-text-primary">{c.title}</p>
                <p className="max-w-[180px] text-body-s text-text-secondary">{c.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex justify-center">
            <PillLink href="/safety" variant="light" arrow>
              How we keep packages safe
            </PillLink>
          </div>
        </Section>
      </div>

      {/* ── What people send ────────────────────────────────────────────── */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-6">
            <SectionHeading
              eyebrow="What people send"
              title="From aso-oke to laptops."
              body="If it fits in a suitcase and it is legal at both ends, it can probably travel with Relay. Carriers inspect every item before they seal it."
            />
            <div className="flex flex-wrap gap-3">
              {CATEGORIES.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-body-m text-text-primary"
                >
                  <span className="text-accent-signal">{c.icon}</span>
                  {c.label}
                </span>
              ))}
            </div>
            <Link href="/terms#prohibited" className="text-body-m font-medium text-text-link hover:underline dark:text-harbor-200">
              See prohibited items →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <Eyebrow>Questions</Eyebrow>
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border bg-card p-5 open:shadow-light">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-title-m text-text-primary">
                  {f.q}
                  <span className="text-accent-signal transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-caption-r text-text-secondary">{f.a}</p>
              </details>
            ))}
            <Link href="/faq" className="mt-2 flex items-center gap-2 text-body-m font-medium text-text-link hover:underline dark:text-harbor-200">
              <MessageCircle size={16} /> Read all questions
            </Link>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
