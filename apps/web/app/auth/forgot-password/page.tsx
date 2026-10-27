'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { Field, FormError, SubmitButton } from '@/components/auth/fields';
import { ApiError, api } from '@/lib/api';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email } });
      router.push(`/auth/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Forgot password?" subtitle="We’ll email you a code to reset it.">
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <FormError>{error}</FormError>
        <Field label="Email" hideLabel type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <SubmitButton busy={busy}>Send reset code</SubmitButton>
        <p className="text-center text-body-m text-text-secondary">
          Remembered it?{' '}
          <Link href="/auth/signin" className="font-semi-bold text-text-link hover:underline dark:text-harbor-200">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
