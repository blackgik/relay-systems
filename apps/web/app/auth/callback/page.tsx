'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormError } from '@/components/auth/fields';
import { homeFor, useAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import { AuthSession } from '@/lib/types';

// Google OAuth lands here with a one-minute exchange code in the URL
// fragment; swap it for a session, then scrub it from history.
export default function OAuthCallback() {
  const { startSession } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = new URLSearchParams(window.location.hash.slice(1)).get('code');
    window.history.replaceState(null, '', window.location.pathname);
    if (!code) {
      setError('Sign-in link is missing or expired.');
      return;
    }
    api<AuthSession>('/auth/oauth/exchange', { method: 'POST', body: { code } })
      .then((session) => {
        startSession(session);
        router.replace(homeFor(session.user));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Google sign-in failed.'));
  }, [router, startSession]);

  return (
    <AuthShell title={error ? 'Sign-in failed' : 'Signing you in'} subtitle={error ? 'Please try again.' : 'Just a moment…'}>
      {error ? (
        <div className="flex flex-col gap-5">
          <FormError>{error}</FormError>
          <Link href="/auth/signin" className="text-center font-semi-bold text-text-link hover:underline dark:text-harbor-200">
            Back to log in
          </Link>
        </div>
      ) : (
        <div className="flex justify-center py-6">
          <Loader2 size={28} className="animate-spin text-icon-brand" />
        </div>
      )}
    </AuthShell>
  );
}
