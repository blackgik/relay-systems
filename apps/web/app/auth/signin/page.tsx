'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { Field, FormError, GoogleButton, OrDivider, PasswordField, SubmitButton } from '@/components/auth/fields';
import { homeFor, useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

const OAUTH_ERRORS: Record<string, string> = {
  google_failed: 'Google sign-in did not complete. Please try again.',
  google_unavailable: 'Google sign-in is not available right now. Use your email instead.',
};

function SignInForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(OAUTH_ERRORS[params.get('error') ?? ''] ?? null);

  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user));
  }, [loading, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      router.push(homeFor(await login(email, password)));
    } catch (err) {
      const body = err instanceof ApiError ? (err.body as { code?: string; email?: string }) : null;
      if (body?.code === 'EMAIL_NOT_VERIFIED') {
        router.push(`/auth/verify-email?email=${encodeURIComponent(body.email ?? email)}&sent=1`);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FormError>{error}</FormError>
      <Field
        label="Email"
        hideLabel
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <PasswordField
        label="Password"
        hideLabel
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Link href="/auth/forgot-password" className="-mt-2 self-end text-body-m text-text-secondary hover:text-text-brand">
        Forgot password?
      </Link>
      <SubmitButton busy={busy}>Log in</SubmitButton>
      <OrDivider />
      <GoogleButton />
      <p className="text-center text-body-m text-text-secondary">
        New to Relay?{' '}
        <Link href="/auth/signup" className="font-semi-bold text-text-link hover:underline dark:text-harbor-200">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function SignIn() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your Relay account">
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
