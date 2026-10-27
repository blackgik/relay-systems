'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormError, OtpInput, SubmitButton } from '@/components/auth/fields';
import { ResendCode } from '@/components/auth/resend-timer';
import { homeFor, useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

function VerifyForm() {
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const { verifyEmail } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      router.push(homeFor(await verifyEmail(email, code)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify. Try again.');
      setCode('');
      setBusy(false);
    }
  };

  // Submit as soon as the sixth digit lands.
  useEffect(() => {
    if (code.length === 6) void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (!email) {
    return (
      <p className="text-center text-body-m text-text-secondary">
        Missing email address.{' '}
        <Link href="/auth/signin" className="font-semi-bold text-text-link dark:text-harbor-200">
          Go back to log in
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-xl bg-brand-subtle px-4 py-3 text-body-m text-text-brand">
        <MailCheck size={18} className="shrink-0" />
        <span>
          Code sent to <strong className="font-semi-bold">{email}</strong>
        </span>
      </div>
      <FormError>{error}</FormError>
      {notice && <p className="text-center text-body-m text-success-text">{notice}</p>}
      <OtpInput value={code} onChange={setCode} disabled={busy} error={!!error} />
      <SubmitButton busy={busy} disabled={code.length !== 6}>
        Verify email
      </SubmitButton>
      <ResendCode
        path="/auth/resend-verification"
        email={email}
        initialSeconds={params.get('sent') ? 60 : 0}
        onMessage={(m) => (m.ok ? (setNotice(m.text), setError(null)) : setError(m.text))}
      />
      <p className="text-center text-body-s text-text-tertiary">
        Wrong email?{' '}
        <Link href="/auth/signup" className="underline">
          Start again
        </Link>
      </p>
    </form>
  );
}

export default function VerifyEmail() {
  return (
    <AuthShell title="Check your email" subtitle="Enter the 6-digit code we sent you. It expires in 10 minutes.">
      <Suspense>
        <VerifyForm />
      </Suspense>
    </AuthShell>
  );
}
