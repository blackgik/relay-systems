'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { Wordmark } from './blocks';

const NAV = [
  { href: '/services', label: 'Services' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/safety', label: 'Safety' },
  { href: '/carriers', label: 'Carry' },
  { href: '/about', label: 'About' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-sticky px-4 pt-4 md:pt-6">
      <div
        className={clsx(
          'mx-auto flex h-16 max-w-6xl items-center gap-2 rounded-full border border-border/70 bg-background/90 pl-5 pr-2 sm:gap-4 sm:pl-6 backdrop-blur-md transition-shadow',
          scrolled ? 'shadow-2lg' : 'shadow-light'
        )}
      >
        <Link href="/" aria-label="Relay home">
          <Wordmark />
        </Link>

        <nav className="mx-auto hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'text-body-m transition-colors hover:text-text-brand',
                pathname === item.href ? 'text-text-brand' : 'text-text-secondary'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <ThemeToggle className="!h-11 !w-11 !rounded-full !border-0 !px-0" />
          {!loading && (
            <Link
              href={user ? '/search' : '/auth/signin'}
              className="hidden h-11 items-center whitespace-nowrap rounded-full bg-surface px-5 text-label-l font-semi-bold text-text-primary hover:bg-surface-pressed sm:inline-flex"
            >
              {user ? 'Dashboard' : 'Log in'}
            </Link>
          )}
          <Link
            href="/search"
            className="inline-flex h-11 items-center whitespace-nowrap gap-2 rounded-full bg-brand px-5 text-label-l font-semi-bold text-brand-foreground hover:bg-brand-focus"
          >
            <span className="hidden xs:inline">Send now</span>
            <span className="xs:hidden">Send</span> <ArrowRight size={16} className="text-accent-signal" />
          </Link>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full text-text-primary hover:bg-surface lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="mx-auto mt-2 flex max-w-6xl flex-col rounded-3xl border border-border bg-background p-3 shadow-2lg lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl px-4 py-3 text-body-l text-text-primary hover:bg-surface"
            >
              {item.label}
            </Link>
          ))}
          {!loading && (
            <Link
              href={user ? '/search' : '/auth/signin'}
              className="rounded-2xl px-4 py-3 text-body-l text-text-brand hover:bg-surface sm:hidden"
            >
              {user ? 'Dashboard' : 'Log in'}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
