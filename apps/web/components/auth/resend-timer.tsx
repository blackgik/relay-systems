'use client';

import React, { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

/** "Resend code" link with a cooldown that matches the API's 60s limit. */
export function ResendCode({
  path,
  email,
  initialSeconds,
  onMessage,
}: {
  path: '/auth/resend-verification' | '/auth/forgot-password';
  email: string;
  initialSeconds: number;
  onMessage: (msg: { ok: boolean; text: string }) => void;
}) {
  const [left, setLeft] = useState(initialSeconds);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const resend = async () => {
    setBusy(true);
    try {
      const res = await api<{ resendInSeconds: number }>(path, { method: 'POST', body: { email } });
      setLeft(res.resendInSeconds ?? 60);
      onMessage({ ok: true, text: `We sent a new code to ${email}.` });
    } catch (err) {
      onMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Could not resend. Try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <p className="text-center text-body-m text-text-secondary">
      Didn’t get it?{' '}
      {left > 0 ? (
        <span className="text-text-tertiary">Resend in 0:{String(left).padStart(2, '0')}</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="font-semi-bold text-text-link hover:underline disabled:opacity-60 dark:text-harbor-200"
        >
          Resend code
        </button>
      )}
    </p>
  );
}
