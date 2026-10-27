import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';

// Shared building blocks for the public marketing pages. Everything reads
// from the semantic tokens so light and dark mode both work.

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('text-[26px] font-extra-bold tracking-tight text-text-primary', className)}>
      relay<span className="text-accent-signal">.</span>
    </span>
  );
}

type PillProps = {
  href: string;
  children: React.ReactNode;
  variant?: 'dark' | 'light' | 'signal';
  arrow?: boolean;
  className?: string;
};

export function PillLink({ href, children, variant = 'dark', arrow, className }: PillProps) {
  return (
    <Link
      href={href}
      className={clsx(
        'inline-flex h-11 items-center gap-2 rounded-full px-5 text-label-l font-semi-bold transition-colors',
        variant === 'dark' && 'bg-brand text-brand-foreground hover:bg-brand-focus',
        variant === 'light' &&
          'border border-border bg-background text-text-primary hover:bg-surface-hover',
        variant === 'signal' && 'bg-accent-signal text-harbor-900 hover:bg-yellow-400',
        className
      )}
    >
      {children}
      {arrow && <ArrowRight size={16} className={variant === 'dark' ? 'text-accent-signal' : ''} />}
    </Link>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  // A colour passed in className replaces the default tertiary tone (no tailwind-merge here).
  const hasColor = /\btext-(?!label-)[a-z]/.test(className ?? '');
  return (
    <p className={clsx('text-label-m uppercase tracking-[0.3em]', !hasColor && 'text-text-tertiary', className)}>
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  accent,
  body,
  center,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  body?: string;
  center?: boolean;
}) {
  return (
    <div className={clsx('flex max-w-2xl flex-col gap-3', center && 'mx-auto items-center text-center')}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="text-headline-l text-text-primary md:text-[40px] md:leading-[48px]">
        {title} {accent && <span className="text-harbor-400 dark:text-harbor-200">{accent}</span>}
      </h2>
      {body && <p className="text-body-l text-text-secondary">{body}</p>}
    </div>
  );
}

export function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={clsx('mx-auto w-full max-w-6xl px-4 py-16 md:py-24', className)}>
      {children}
    </section>
  );
}

/** Soft warm wash with blurred light blobs, echoing a sunlit studio. */
export function Glow({ className }: { className?: string }) {
  return (
    <div aria-hidden className={clsx('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-brand-subtle opacity-70 blur-3xl dark:opacity-40" />
      <div className="absolute right-[-10%] top-10 h-[360px] w-[360px] rounded-full bg-accent-signal/20 blur-3xl" />
      <div className="absolute bottom-[-20%] left-1/3 h-[300px] w-[300px] rounded-full bg-harbor-100/40 blur-3xl dark:bg-harbor-700/30" />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  accent,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate">
      <Glow />
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-12 pt-36 md:pb-16 md:pt-44">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="max-w-3xl text-display-s text-text-primary md:text-[56px] md:leading-[64px]">
          {title}
          {accent && (
            <>
              {' '}
              <span className="text-harbor-400 dark:text-harbor-200">{accent}</span>
            </>
          )}
          <span className="text-accent-signal">.</span>
        </h1>
        <p className="max-w-2xl text-body-l text-text-secondary">{body}</p>
        {children}
      </div>
    </section>
  );
}

export function FeatureCard({
  icon,
  title,
  body,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-light transition-shadow hover:shadow-2lg',
        className
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle text-icon-brand dark:text-accent-signal">
        {icon}
      </span>
      <h3 className="text-title-base text-text-primary">{title}</h3>
      <p className="text-caption-r text-text-secondary">{body}</p>
    </div>
  );
}

export function CtaBand({
  title = 'Your package is one trip away',
  body = 'Search a route in seconds, or list a trip you are already taking and get paid to carry.',
}: {
  title?: string;
  body?: string;
}) {
  return (
    <Section className="py-12 md:py-16">
      <div className="relative overflow-hidden rounded-[28px] bg-harbor-900 px-6 py-12 md:px-14 md:py-16">
        <svg
          aria-hidden
          className="absolute -right-10 top-1/2 h-[140%] -translate-y-1/2 text-harbor-400/40"
          viewBox="0 0 400 300"
          fill="none"
        >
          <path
            d="M10 260 C 120 260, 140 80, 250 80 S 390 40, 390 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 10"
          />
          <circle cx="10" cy="260" r="7" fill="#F59E0B" />
          <circle cx="250" cy="80" r="7" fill="#F59E0B" />
          <circle cx="390" cy="10" r="7" fill="#F59E0B" />
        </svg>
        <div className="relative flex max-w-xl flex-col gap-4">
          <h2 className="text-headline-l text-white md:text-[40px] md:leading-[48px]">
            {title}
            <span className="text-accent-signal">.</span>
          </h2>
          <p className="text-body-l text-white/75">{body}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <PillLink href="/search" variant="signal" arrow>
              Send a package
            </PillLink>
            <Link
              href="/carriers"
              className="inline-flex h-11 items-center rounded-full border border-white/25 px-5 text-label-l font-semi-bold text-white hover:bg-white/10"
            >
              Become a carrier
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

/** Long-form layout for legal pages: sticky contents rail + numbered sections. */
export function LegalDoc({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  sections: { id: string; title: string; body: React.ReactNode }[];
}) {
  return (
    <>
      <section className="relative isolate">
        <Glow />
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-36 md:pt-44">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="mt-4 text-display-s text-text-primary md:text-[56px] md:leading-[64px]">
            {title}
            <span className="text-accent-signal">.</span>
          </h1>
          <p className="mt-3 text-body-m text-text-tertiary">Last updated {updated}</p>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 md:grid-cols-[220px_1fr]">
        <nav aria-label="Contents" className="hidden md:block">
          <ol className="sticky top-28 flex flex-col gap-2 border-l border-border pl-4">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-body-s text-text-secondary hover:text-text-brand">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="flex max-w-3xl flex-col gap-10">
          <div className="rounded-2xl border border-border bg-surface p-6 text-caption-r text-text-secondary">
            {intro}
          </div>
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="text-headline-s text-text-primary">
                <span className="mr-2 text-accent-signal">{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </h2>
              <div className="legal-body mt-4 flex flex-col gap-3 text-caption-r text-text-secondary">
                {s.body}
              </div>
            </section>
          ))}
        </article>
      </div>
    </>
  );
}
