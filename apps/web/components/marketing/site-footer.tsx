import React from 'react';
import Link from 'next/link';
import { Wordmark } from './blocks';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/services', label: 'Services' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/search', label: 'Send a package' },
    ],
  },
  {
    title: 'Carriers',
    links: [
      { href: '/carriers', label: 'Become a carrier' },
      { href: '/carry', label: 'List a trip' },
      { href: '/kyc', label: 'Get verified' },
      { href: '/wallet', label: 'Wallet' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About us' },
      { href: '/safety', label: 'Trust & safety' },
      { href: '/faq', label: 'FAQ' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms & conditions' },
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms#prohibited', label: 'Prohibited items' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="flex flex-col gap-3">
          <Wordmark />
          <p className="max-w-xs text-caption-r text-text-secondary">
            A peer-to-peer logistics network. Travelers carry packages along routes they are already
            taking, sealed and escrowed from pickup to doorstep.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="flex flex-col gap-3">
            <p className="text-label-l font-semi-bold text-text-primary">{col.title}</p>
            {col.links.map((l) => (
              <Link key={l.href} href={l.href} className="text-body-m text-text-secondary hover:text-text-brand">
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-body-s text-text-tertiary md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} Relay. All rights reserved.</p>
          <p>Awka · Abuja · Lagos · Houston · London</p>
        </div>
      </div>
    </footer>
  );
}
