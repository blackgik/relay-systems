'use client';

import React, { useState } from 'react';
import { Badge, Button, CircularLoader, Typography, toast } from '@/ui/elements';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';

const CHECKS = [
  { type: 'NIN', label: 'NIN — verify to Tier 1' },
  { type: 'BVN', label: 'BVN — verify to Tier 1' },
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
              routes. Verification is mocked for the demo and passes instantly.
            </Typography>
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
