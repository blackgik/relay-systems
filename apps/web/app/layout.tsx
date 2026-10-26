import type { Metadata } from 'next';
import '../src/styles/tokens.css';
import './globals.css';
import { brandFont } from '@/utils/fonts';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Relay — Peer-to-peer logistics',
  description: 'Travelers carry packages along routes they already take.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the theme toggle and browser extensions add
    // classes to <html>/<body> before hydration. Only these two elements'
    // own attributes are exempt; children are still checked.
    <html lang="en" className={brandFont.variable} suppressHydrationWarning>
      <body className="bg-background text-foreground" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
