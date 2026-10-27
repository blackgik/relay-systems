'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import {
  Field,
  FormError,
  GoogleButton,
  OrDivider,
  PasswordField,
  PasswordStrength,
  SubmitButton,
} from '@/components/auth/fields';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

const PASSWORD_OK = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function SignUp() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!PASSWORD_OK.test(form.password)) {
      setError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }
    if (!agreed) {
      setError('Please accept the Terms and Privacy Policy to continue.');
      return;
    }
    setBusy(true);
    try {
      const result = await register(form);
      router.push(`/auth/verify-email?email=${encodeURIComponent(result.email)}&sent=1`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Send and carry with verified people"
      panelTitle="Your route is someone’s delivery."
      panelBody="Sign up in a minute. We’ll confirm your email with a code, then verify your identity so everyone on Relay knows who they’re dealing with."
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormError>{error}</FormError>
        <Field label="Full name" hideLabel autoComplete="name" value={form.fullName} onChange={set('fullName')} required />
        <Field label="Email" hideLabel type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        <Field
          label="Phone number"
          hideLabel
          type="tel"
          autoComplete="tel"
          placeholder="Phone number (+234…)"
          value={form.phone}
          onChange={set('phone')}
          required
        />
        <PasswordField
          label="Password"
          hideLabel
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          required
        />
        <PasswordStrength value={form.password} />
        <label className="flex items-start gap-3 text-body-m text-text-secondary">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-brand focus:ring-brand"
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" target="_blank" className="font-medium text-text-link underline dark:text-harbor-200">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" target="_blank" className="font-medium text-text-link underline dark:text-harbor-200">
              Privacy Policy
            </Link>
          </span>
        </label>
        <SubmitButton busy={busy}>Create account</SubmitButton>
        <OrDivider />
        <GoogleButton intent="signup" />
        <p className="text-center text-body-m text-text-secondary">
          Already have an account?{' '}
          <Link href="/auth/signin" className="font-semi-bold text-text-link hover:underline dark:text-harbor-200">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
