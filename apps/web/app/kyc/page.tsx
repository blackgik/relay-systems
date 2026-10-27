'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, CircularLoader, Typography, toast } from '@/ui/elements';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';

const CHECKS = [
  { type: 'PASSPORT', label: 'Passport — verify to Tier 2' },
];

export default function Kyc() {
  const { user, token, loading, refreshUser } = useRequireAuth();
  const [busy, setBusy] = useState<string | null>(null);

  if (!loading && !user) {
    return null;
  }

  const verify = async (type: string) => {
    setBusy(type);
    try {
      await api('/kyc/start', { method: 'POST', body: { type }, token });
      await refreshUser();
      toast.success({ title: 'Verified', description: `${type} check passed.` });
    } catch (err) {
      toast.error({
        title: 'Verification failed',
        description: err instanceof ApiError ? err.message : 'Try again',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <div className="flex max-w-xl flex-col gap-4 py-6">
        <Typography size="headline-m" weight="bold" color="primary" as="h1">
          Identity verification
        </Typography>
        {loading || !user ? (
          <CircularLoader />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Typography size="body-m" color="secondary" as="p">
                Current tier:
              </Typography>
              <Badge label={user.kycTier} color={user.kycTier === 'T0' ? 'neutral' : 'success'} />
            </div>
            <Typography size="body-m" color="secondary" as="p">
              Tier 1 unlocks domestic sending and carrying. Tier 2 unlocks international
              routes. The passport check is mocked for the demo and passes instantly.
            </Typography>
            {user.onboarding.status !== 'VERIFIED' && user.kycTier === 'T0' && (
              <Link
                href="/onboarding"
                className="rounded-lg border border-border-brand p-4 text-body-m font-medium text-text-brand hover:bg-surface-hover"
              >
                {user.onboarding.status === 'SUBMITTED'
                  ? 'Your verification is under review →'
                  : 'Start identity verification (NIN, BVN, ID and bank) →'}
              </Link>
            )}
            <div className="flex flex-col gap-3">
              {CHECKS.map((check) => (
                <div
                  key={check.type}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <Typography size="body-m" weight="medium" color="primary" as="p">
                    {check.label}
                  </Typography>
                  <Button
                    label={busy === check.type ? 'Verifying…' : 'Verify'}
                    variant="secondary"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => verify(check.type)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
