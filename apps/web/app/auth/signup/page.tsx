'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Typography, toast } from '@/ui/elements';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function SignUp() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', phone: '', fullName: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(form);
      router.push('/kyc');
    } catch (err) {
      toast.error({
        title: 'Sign up failed',
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
          Create your account
        </Typography>
        <Input name="fullName" label="Full name" value={form.fullName} onChange={set('fullName')} />
        <Input name="email" label="Email" value={form.email} onChange={set('email')} />
        <Input name="phone" label="Phone" value={form.phone} onChange={set('phone')} />
        <Input
          name="password"
          label="Password (8+ characters)"
          type="password"
          value={form.password}
          onChange={set('password')}
        />
        <Button type="submit" label={busy ? 'Creating…' : 'Create account'} size="lg" disabled={busy} />
        <Typography size="body-m" color="secondary" as="p">
          Have an account?{' '}
          <Link href="/auth/signin" className="font-medium text-text-brand">
            Sign in
          </Link>
        </Typography>
      </form>
    </AppShell>
  );
}
