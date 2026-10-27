'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { BadgeCheck, CircleAlert, Clock, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { Field, FormError, SelectField, SubmitButton } from '@/components/auth/fields';
import { ApiError, api } from '@/lib/api';
import { OnboardingState } from '@/lib/types';
import { PhotoInput } from './photo-input';
import { ID_TYPES, NG_STATES } from './constants';

type StepProps = {
  state: OnboardingState;
  token: string | null;
  onSaved: (next: OnboardingState) => void;
  onBack?: () => void;
};

const errorText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.');

function useSave(token: string | null, onSaved: (s: OnboardingState) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (method: 'PUT' | 'POST', path: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await api<OnboardingState>(`/kyc/onboarding${path}`, { method, body, token }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, save };
}

function Actions({ busy, onBack, label = 'Save and continue' }: { busy: boolean; onBack?: () => void; label?: string }) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="h-14 rounded-xl border border-border px-6 text-title-m text-text-primary hover:bg-surface sm:w-40"
        >
          Back
        </button>
      )}
      <SubmitButton busy={busy}>{label}</SubmitButton>
    </div>
  );
}

function Notice({ icon, children, tone = 'brand' }: { icon: React.ReactNode; children: React.ReactNode; tone?: 'brand' | 'warning' }) {
  return (
    <div
      className={clsx(
        'flex gap-3 rounded-2xl p-4 text-body-m',
        tone === 'brand' ? 'bg-brand-subtle text-text-brand' : 'bg-warning-subtle text-warning-text'
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

// ── 1. Personal ──────────────────────────────────────────────────────────

export function PersonalStep({ state, token, onSaved }: StepProps) {
  const p = state.personal;
  const [form, setForm] = useState({
    firstName: p?.firstName ?? '',
    middleName: p?.middleName ?? '',
    lastName: p?.lastName ?? '',
    dateOfBirth: p?.dateOfBirth ?? '',
    gender: p?.gender ?? '',
    phone: '',
    address: p?.address ?? '',
    city: p?.city ?? '',
    state: p?.state ?? '',
  });
  const { busy, error, save } = useSave(token, onSaved);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const maxDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().slice(0, 10);
  }, []);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const { phone, middleName, ...rest } = form;
        void save('PUT', '/personal', {
          ...rest,
          ...(middleName.trim() ? { middleName: middleName.trim() } : {}),
          ...(state.needsPhone ? { phone } : {}),
        });
      }}
    >
      <Notice icon={<BadgeCheck size={18} />}>
        Enter your name <strong>exactly as it appears on your ID and bank account</strong>. We match them later, and
        payouts only go to an account in this name.
      </Notice>
      <FormError>{error}</FormError>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="First name" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} required />
        <Field label="Middle name (optional)" autoComplete="additional-name" value={form.middleName} onChange={set('middleName')} />
        <Field label="Surname" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of birth" type="date" max={maxDob} value={form.dateOfBirth} onChange={set('dateOfBirth')} required />
        <SelectField
          label="Gender"
          value={form.gender}
          onChange={set('gender')}
          options={[
            { value: 'FEMALE', label: 'Female' },
            { value: 'MALE', label: 'Male' },
          ]}
          required
        />
      </div>
      {state.needsPhone && (
        <Field label="Phone number" type="tel" autoComplete="tel" placeholder="+234…" value={form.phone} onChange={set('phone')} required />
      )}
      <Field label="Residential address" autoComplete="street-address" value={form.address} onChange={set('address')} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City / town" autoComplete="address-level2" value={form.city} onChange={set('city')} required />
        <SelectField
          label="State"
          value={form.state}
          onChange={set('state')}
          options={NG_STATES.map((s) => ({ value: s, label: s }))}
          required
        />
      </div>
      <Actions busy={busy} />
    </form>
  );
}

// ── 2. NIN & BVN ─────────────────────────────────────────────────────────

export function IdentityStep({ state, token, onSaved, onBack }: StepProps) {
  const [nin, setNin] = useState('');
  const [bvn, setBvn] = useState('');
  const { busy, error, setError, save } = useSave(token, onSaved);
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 11);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (nin.length !== 11 || bvn.length !== 11) return setError('NIN and BVN must each be 11 digits.');
        void save('PUT', '/identity', { nin, bvn });
      }}
    >
      <Notice icon={<Lock size={18} />}>
        Both numbers are encrypted the moment they reach us and are never shown in full again — not to carriers, not
        to support. Each NIN and BVN can only be linked to one Relay account.
      </Notice>
      {state.identity && (
        <p className="text-body-m text-text-secondary">
          On file: NIN ••••{state.identity.ninLast4} · BVN ••••{state.identity.bvnLast4}. Re-enter both to change them.
        </p>
      )}
      <FormError>{error}</FormError>
      <Field
        label="National Identification Number (NIN)"
        inputMode="numeric"
        autoComplete="off"
        value={nin}
        onChange={(e) => setNin(digits(e.target.value))}
        hint="11 digits. Forgot it? Dial *346# from the phone number linked to your NIN."
        trailing={<span className="text-body-s text-text-tertiary">{nin.length}/11</span>}
        required
      />
      <Field
        label="Bank Verification Number (BVN)"
        inputMode="numeric"
        autoComplete="off"
        value={bvn}
        onChange={(e) => setBvn(digits(e.target.value))}
        hint="11 digits. Dial *565*0# from the phone number registered with your bank."
        trailing={<span className="text-body-s text-text-tertiary">{bvn.length}/11</span>}
        required
      />
      <Actions busy={busy} onBack={onBack} />
    </form>
  );
}

// ── 3. ID document & selfie ──────────────────────────────────────────────

export function DocumentsStep({ state, token, onSaved, onBack }: StepProps) {
  const [idType, setIdType] = useState(state.documents?.idType ?? '');
  const [idNumber, setIdNumber] = useState('');
  const [idDocument, setIdDocument] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const { busy, error, setError, save } = useSave(token, onSaved);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!idDocument || !selfie) return setError('Add both a photo of your ID and a selfie holding it.');
        void save('PUT', '/documents', { idType, idNumber: idNumber.trim(), idDocument, selfie });
      }}
    >
      <Notice icon={<ShieldCheck size={18} />}>
        The selfie with your ID is what stops someone using stolen numbers: they would also need your face and your
        physical card.
      </Notice>
      <FormError>{error}</FormError>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="ID type" value={idType} onChange={(e) => setIdType(e.target.value)} options={ID_TYPES} required />
        <Field
          label="ID number"
          autoComplete="off"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <PhotoInput
          label="Photo of your ID"
          hint="Front side, all four corners visible, no glare."
          value={idDocument}
          onChange={setIdDocument}
          capture="environment"
        />
        <PhotoInput
          label="Selfie holding your ID"
          hint="Your face and the ID both clearly visible."
          value={selfie}
          onChange={setSelfie}
          capture="user"
        />
      </div>
      <Actions busy={busy} onBack={onBack} />
    </form>
  );
}

// ── 4. Bank account (last) ───────────────────────────────────────────────

type Resolved = { accountName: string; nameMatches: boolean };

export function BankStep({ state, token, onSaved, onBack }: StepProps) {
  const [banks, setBanks] = useState<{ name: string; code: string }[] | null>(null);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const { busy, error, save } = useSave(token, onSaved);

  useEffect(() => {
    api<{ name: string; code: string }[]>('/kyc/onboarding/banks', { token })
      .then((list) => setBanks([...list].sort((a, b) => a.name.localeCompare(b.name))))
      .catch((err) => setResolveError(errorText(err)));
  }, [token]);

  // Look the account up with Paystack as soon as we have a bank + 10 digits.
  useEffect(() => {
    setResolved(null);
    setResolveError(null);
    if (!bankCode || accountNumber.length !== 10) return;
    let cancelled = false;
    setResolving(true);
    api<Resolved>('/kyc/onboarding/bank/resolve', { method: 'POST', body: { bankCode, accountNumber }, token })
      .then((r) => !cancelled && setResolved(r))
      .catch((err) => !cancelled && setResolveError(errorText(err)))
      .finally(() => !cancelled && setResolving(false));
    return () => {
      cancelled = true;
    };
  }, [bankCode, accountNumber, token]);

  const legalName = [state.personal?.firstName, state.personal?.middleName, state.personal?.lastName].filter(Boolean).join(' ');

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void save('PUT', '/bank', { bankCode, accountNumber });
      }}
    >
      <Notice icon={<BadgeCheck size={18} />}>
        Earnings and refunds are paid here. The account must be in your name, <strong>{legalName}</strong> — we check
        with your bank through Paystack, and confirm your BVN owns it.
      </Notice>
      {state.bank && (
        <p className="text-body-m text-text-secondary">
          On file: {state.bank.bankName} ••••{state.bank.accountLast4} ({state.bank.accountName}). Enter a new account to change it.
        </p>
      )}
      <FormError>{error}</FormError>
      <SelectField
        label="Bank"
        value={bankCode}
        onChange={(e) => setBankCode(e.target.value)}
        options={(banks ?? []).map((b) => ({ value: b.code, label: b.name }))}
        placeholder={banks ? 'Select your bank' : 'Loading banks…'}
        disabled={!banks}
        required
      />
      <Field
        label="Account number"
        inputMode="numeric"
        autoComplete="off"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
        hint="10-digit NUBAN"
        required
      />
      <div aria-live="polite">
        {resolving && (
          <p className="flex items-center gap-2 text-body-m text-text-tertiary">
            <RefreshCw size={16} className="animate-spin" /> Checking with your bank…
          </p>
        )}
        {resolveError && <FormError>{resolveError}</FormError>}
        {resolved && (
          <div
            className={clsx(
              'flex items-center gap-3 rounded-2xl border p-4',
              resolved.nameMatches ? 'border-success/30 bg-success-subtle' : 'border-destructive/30 bg-destructive-subtle'
            )}
          >
            {resolved.nameMatches ? (
              <BadgeCheck size={20} className="shrink-0 text-success-text" />
            ) : (
              <CircleAlert size={20} className="shrink-0 text-destructive" />
            )}
            <div>
              <p className="text-title-s text-text-primary">{resolved.accountName}</p>
              <p className={clsx('text-body-s', resolved.nameMatches ? 'text-success-text' : 'text-destructive')}>
                {resolved.nameMatches
                  ? 'Matches your legal name'
                  : 'Does not match your legal name — use an account in your own name'}
              </p>
            </div>
          </div>
        )}
      </div>
      <Actions busy={busy} onBack={onBack} label="Verify and continue" />
    </form>
  );
}

// ── 5. Review & submit ───────────────────────────────────────────────────

const BVN_MATCH: Record<string, { label: string; tone: string; icon: React.ReactNode }> = {
  VERIFIED: { label: 'BVN confirmed as owner of this account', tone: 'text-success-text', icon: <BadgeCheck size={16} /> },
  PENDING: { label: 'Paystack is confirming your BVN owns this account', tone: 'text-text-tertiary', icon: <Clock size={16} /> },
  FAILED: { label: 'BVN did not match this account — a reviewer will check it', tone: 'text-destructive', icon: <CircleAlert size={16} /> },
  UNAVAILABLE: { label: 'Automatic BVN check unavailable — a reviewer will check it', tone: 'text-warning-text', icon: <CircleAlert size={16} /> },
};

export function ReviewStep({ state, token, onSaved, onBack, onEdit }: StepProps & { onEdit: (step: OnboardingState['step']) => void }) {
  const [agreed, setAgreed] = useState(false);
  const { busy, error, setError, save } = useSave(token, onSaved);
  const [refreshing, setRefreshing] = useState(false);
  const p = state.personal!;
  const match = BVN_MATCH[state.bank?.bvnMatch ?? 'PENDING'];

  const refresh = async () => {
    setRefreshing(true);
    try {
      onSaved(await api<OnboardingState>('/kyc/onboarding/bank/refresh', { method: 'POST', token }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setRefreshing(false);
    }
  };

  const rows: { step: OnboardingState['step']; title: string; items: [string, string][] }[] = [
    {
      step: 'PERSONAL',
      title: 'Personal details',
      items: [
        ['Legal name', [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')],
        ['Date of birth', p.dateOfBirth],
        ['Address', `${p.address}, ${p.city}, ${p.state}`],
      ],
    },
    {
      step: 'IDENTITY',
      title: 'NIN & BVN',
      items: [
        ['NIN', `••••••• ${state.identity?.ninLast4}`],
        ['BVN', `••••••• ${state.identity?.bvnLast4}`],
      ],
    },
    {
      step: 'DOCUMENTS',
      title: 'ID & selfie',
      items: [
        ['ID', `${ID_TYPES.find((t) => t.value === state.documents?.idType)?.label ?? ''} ••••${state.documents?.idNumberLast4}`],
        ['Photos', 'ID photo and selfie uploaded'],
      ],
    },
    {
      step: 'BANK',
      title: 'Payout account',
      items: [
        ['Bank', state.bank?.bankName ?? ''],
        ['Account', `${state.bank?.accountName} ••••${state.bank?.accountLast4}`],
      ],
    },
  ];

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!agreed) return setError('Please confirm the declaration to submit.');
        void save('POST', '/submit');
      }}
    >
      <FormError>{error}</FormError>
      {rows.map((r) => (
        <section key={r.step} className="rounded-2xl border border-border p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-title-m text-text-primary">{r.title}</h3>
            <button type="button" onClick={() => onEdit(r.step)} className="text-body-m font-medium text-text-link hover:underline dark:text-harbor-200">
              Edit
            </button>
          </div>
          <dl className="grid gap-2">
            {r.items.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] gap-3 text-body-m">
                <dt className="text-text-tertiary">{k}</dt>
                <dd className="text-text-primary">{v}</dd>
              </div>
            ))}
          </dl>
          {r.step === 'BANK' && (
            <div className={clsx('mt-3 flex items-center gap-2 text-body-s', match.tone)}>
              {match.icon} {match.label}
              {state.bank?.bvnMatch === 'PENDING' && (
                <button type="button" onClick={refresh} disabled={refreshing} className="ml-auto font-medium text-text-link hover:underline dark:text-harbor-200">
                  {refreshing ? 'Checking…' : 'Check again'}
                </button>
              )}
            </div>
          )}
        </section>
      ))}
      <label className="flex items-start gap-3 rounded-2xl bg-surface p-4 text-body-m text-text-secondary">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-brand focus:ring-brand"
        />
        I confirm these details are mine and accurate. I understand that giving false information or using someone
        else&apos;s identity will close my account and may be reported to the authorities.
      </label>
      <Actions busy={busy} onBack={onBack} label="Submit for verification" />
    </form>
  );
}
