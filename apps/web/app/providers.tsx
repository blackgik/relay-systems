'use client';

import React from 'react';
import { MotionConfig } from 'motion/react';
import { CurrencyProvider } from '@/lib/currency';
import { AuthProvider } from '@/lib/auth';
import { ToastContainer } from '@/ui/elements';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Every Motion animation honours the OS "reduce motion" setting.
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <CurrencyProvider>
          {children}
          <ToastContainer />
        </CurrencyProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
