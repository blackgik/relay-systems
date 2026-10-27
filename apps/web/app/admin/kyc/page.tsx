'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, CircularLoader, Typography, toast } from '@/ui/elements';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';

interface Submission {
  userId: string;
  email: string;
  phone: string | null;
  legalName: string;
  dateOfBirth: string;
  address: string;
  ninLast4: string;
  bvnLast4: string;
  idType: string;
  idNumberLast4: string;
  idDocument: string | null;
  selfie: string | null;
  bank: { bankName: string; accountLast4: string; accountName: string; bvnMatch: string } | null;
  submittedAt: string;
}

const MATCH_COLOR: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  FAILED: 'error',
  UNAVAILABLE: 'neutral',
};

export default function KycReview() {
  const { user, token, loading } = useRequireAuth();
  const [items, setItems] = useState<Submission[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    api<Submission[]>('/kyc/onboarding/admin/pending', { token })
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load the queue'));
  }, [token]);

  useEffect(load, [load]);

  if (!loading && !user) return null;

  const decide = async (userId: string, decision: 'APPROVE' | 'REJECT') => {
    const note = notes[userId]?.trim();
    if (decision === 'REJECT' && !note) {
      toast.error({ title: 'Add a reason', description: 'The user sees this note when they resubmit.' });
      return;
    }
    setBusy(userId);
    try {
      await api(`/kyc/onboarding/admin/${userId}/review`, { method: 'POST', body: { decision, note }, token });
      toast.success({ title: decision === 'APPROVE' ? 'Approved' : 'Rejected', description: 'The user has been emailed.' });
      setItems((list) => list?.filter((i) => i.userId !== userId) ?? null);
    } catch (err) {
      toast.error({ title: 'Review failed', description: err instanceof ApiError ? err.message : 'Try again' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography size="headline-m" weight="bold" color="primary" as="h1">
          KYC review
        </Typography>
        <Typography size="body-m" color="secondary" as="p">
          Submissions Paystack could not auto-verify. Compare the selfie to the ID and the names across ID, BVN and bank.
        </Typography>
      </div>
      {error && <Typography size="body-m" color="error">{error}</Typography>}
      {!items && !error && <CircularLoader />}
      {items?.length === 0 && (
        <Typography size="body-m" color="secondary">
          The queue is empty.
        </Typography>
      )}
      {items?.map((s) => (
        <article key={s.userId} className="grid gap-6 rounded-2xl border border-border bg-card p-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="grid grid-cols-2 gap-3">
            {[s.idDocument, s.selfie].map((src, i) => (
              <figure key={i} className="flex flex-col gap-1">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={i ? 'Selfie with ID' : 'ID document'} className="aspect-[4/3] w-full rounded-xl object-cover" />
                ) : (
                  <div className="aspect-[4/3] rounded-xl bg-muted" />
                )}
                <figcaption className="text-body-s text-text-tertiary">{i ? 'Selfie with ID' : 'ID document'}</figcaption>
              </figure>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Typography size="title-l" weight="semi-bold" color="primary" as="h2">
                {s.legalName}
              </Typography>
              {s.bank && <Badge label={`BVN match: ${s.bank.bvnMatch}`} color={MATCH_COLOR[s.bank.bvnMatch] ?? 'neutral'} />}
            </div>
            <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-1.5 text-body-m">
              {[
                ['Email', s.email],
                ['Phone', s.phone ?? '—'],
                ['Date of birth', s.dateOfBirth],
                ['Address', s.address],
                ['NIN / BVN', `••••${s.ninLast4} / ••••${s.bvnLast4}`],
                ['ID', `${s.idType} ••••${s.idNumberLast4}`],
                ['Bank', s.bank ? `${s.bank.bankName} ••••${s.bank.accountLast4}` : '—'],
                ['Account name', s.bank?.accountName ?? '—'],
                ['Submitted', new Date(s.submittedAt).toLocaleString()],
              ].map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt className="text-text-tertiary">{k}</dt>
                  <dd className="text-text-primary">{v}</dd>
                </React.Fragment>
              ))}
            </dl>
            <textarea
              value={notes[s.userId] ?? ''}
              onChange={(e) => setNotes((n) => ({ ...n, [s.userId]: e.target.value }))}
              placeholder="Note to the user (required to reject)"
              rows={2}
              className="rounded-xl border border-border bg-surface p-3 text-body-m text-text-primary"
            />
            <div className="flex gap-3">
              <Button label="Approve" fit disabled={busy === s.userId} onClick={() => decide(s.userId, 'APPROVE')} />
              <Button
                label="Reject"
                variant="secondary-destructive"
                fit
                disabled={busy === s.userId}
                onClick={() => decide(s.userId, 'REJECT')}
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
