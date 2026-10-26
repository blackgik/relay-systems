import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Typography } from '@/ui/elements';
import { ThemeToggle } from './theme-toggle';
import { AuthButtons } from './auth-buttons';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Send' },
  { href: '/carry', label: 'Carry' },
  { href: '/admin', label: 'Admin' },
  { href: '/kyc', label: 'Verify' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/dev-preview', label: 'Gallery' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/svgs/relay-mark.svg" width={28} height={28} alt="Relay" />
            <Typography size="title-m" weight="semi-bold" color="primary" as="span">
              Relay
            </Typography>
          </Link>
          <nav className="ml-6 flex items-center gap-5">
            {NAV.slice(1).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-body-m font-medium text-text-secondary hover:text-text-brand"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <AuthButtons />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
