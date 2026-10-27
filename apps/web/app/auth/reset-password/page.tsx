'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormError, OtpInput, PasswordField, PasswordStrength, SubmitButton } from '@/components/auth/fields';
import { ResendCode } from '@/components/auth/resend-timer';
import { homeFor, useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

const PASSWORD_OK = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function ResetForm() {
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) return setError('Enter the 6-digit code from your email.');
    if (!PASSWORD_OK.test(password)) return setError('Password must be at least 8 characters and include a letter and a number.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      router.push(homeFor(await resetPassword(email, code, password)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset password. Try again.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <p className="text-center text-body-m text-text-secondary">
        If <strong className="font-semi-bold text-text-primary">{email}</strong> has an account, a code is on its way.
      </p>
      <FormError>{error}</FormError>
      {notice && <p className="text-center text-body-m text-success-text">{notice}</p>}
      <OtpInput value={code} onChange={setCode} disabled={busy} />
      <PasswordField label="New password" hideLabel autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <PasswordStrength value={password} />
      <PasswordField label="Confirm new password" hideLabel autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <SubmitButton busy={busy}>Reset password</SubmitButton>
      <ResendCode
        path="/auth/forgot-password"
        email={email}
        initialSeconds={60}
        onMessage={(m) => (m.ok ? (setNotice(m.text), setError(null)) : setError(m.text))}
      />
      <p className="text-center text-body-s text-text-tertiary">
        <Link href="/auth/signin" className="underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}

export default function ResetPassword() {
  return (
    <AuthShell title="Set a new password" subtitle="Enter the code from your email and choose a new password.">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
