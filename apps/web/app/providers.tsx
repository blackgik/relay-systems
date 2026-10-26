'use client';

import React from 'react';
import { CurrencyProvider } from '@/lib/currency';
import { AuthProvider } from '@/lib/auth';
import { ToastContainer } from '@/ui/elements';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        {children}
        <ToastContainer />
      </CurrencyProvider>
    </AuthProvider>
  );
}
