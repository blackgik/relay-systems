'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Typography, toast } from '@/ui/elements';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function SignIn() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      router.push('/search');
    } catch (err) {
      toast.error({
        title: 'Sign in failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <form onSubmit={submit} className="mx-auto flex max-w-md flex-col gap-4 py-10">
        <Typography size="headline-m" weight="bold" color="primary" as="h1">
          Sign in
        </Typography>
        <Input name="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          name="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" label={busy ? 'Signing in…' : 'Sign in'} size="lg" disabled={busy} />
        <Typography size="body-m" color="secondary" as="p">
          New here?{' '}
          <Link href="/auth/signup" className="font-medium text-text-brand">
            Create an account
          </Link>
        </Typography>
      </form>
    </AppShell>
  );
}
