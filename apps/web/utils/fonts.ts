import { Archivo } from 'next/font/google';

// Relay brand face: Archivo (OFL) — a sturdy grotesque with an industrial
// character that suits logistics. Loaded as a CSS variable so the token
// stack (font-sans / font-brand) resolves through --font-brand.
export const brandFont = Archivo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-brand',
});
