import React from 'react';
import { AppShell } from '@/components/app-shell';

export default function CarrierLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
