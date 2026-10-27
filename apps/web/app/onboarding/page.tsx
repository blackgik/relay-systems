'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ArrowRight, BadgeCheck, Check, CircleAlert, Clock, Loader2, LogOut } from 'lucide-react';
import { Wordmark } from '@/components/marketing/blocks';
import { ThemeToggle } from '@/components/theme-toggle';
import { STEPS } from '@/components/onboarding/constants';
import { BankStep, DocumentsStep, IdentityStep, PersonalStep, ReviewStep } from '@/components/onboarding/steps';
import { FormError } from '@/components/auth/fields';
import { useRequireAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/api';
import { OnboardingState, OnboardingStep } from '@/lib/types';

export default function Onboarding() {
  const { user, token, loading, logout, refreshUser } = useRequireAuth();
  const router = useRouter();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [view, setView] = useState<OnboardingStep>('PERSONAL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api<OnboardingState>('/kyc/onboarding', { token })
      .then((s) => {
        setState(s);
        setView(s.step);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your verification'));
  }, [token]);

  const onSaved = (next: OnboardingState) => {
    setState(next);
    setView(next.step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (next.status === 'SUBMITTED' || next.status === 'VERIFIED') void refreshUser();
  };

  if (!loading && !user) return null;

  const reached = state ? STEPS.findIndex((s) => s.id === state.step) : 0;
  const current = STEPS.findIndex((s) => s.id === view);
  const goTo = (step: OnboardingStep) => setView(step);
  const back = current > 0 ? () => setView(STEPS[current - 1].id) : undefined;
  const done = state && ['SUBMITTED', 'VERIFIED'].includes(state.status);

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/" aria-label="Relay home">
            <Wordmark />
          </Link>
          <span className="hidden text-body-m text-text-tertiary sm:inline">· Identity verification</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle className="!h-10 !w-10 !rounded-full !border-0 !px-0" />
            <button
              type="button"
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="flex h-10 items-center gap-2 rounded-full px-4 text-body-m text-text-secondary hover:bg-surface"
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit rounded-[28px] bg-harbor-900 p-6 lg:sticky lg:top-8">
          <p className="text-label-m uppercase tracking-[0.3em] text-white/50">Step {Math.min(current + 1, 5)} of 5</p>
          <h1 className="mt-3 text-headline-s text-white">
            Verify your identity<span className="text-accent-signal">.</span>
          </h1>
          <p className="mt-2 text-body-m text-white/70">
            Required before you send or carry. It keeps stolen identities off the network.
          </p>
          <ol className="mt-6 flex flex-col gap-1">
            {STEPS.map((s, i) => {
              const complete = done || i < reached;
              const clickable = !done && i <= reached;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => goTo(s.id)}
                    className={clsx(
                      'flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors',
                      !done && i === current ? 'bg-white/10' : clickable && 'hover:bg-white/5'
                    )}
                  >
                    <span
                      className={clsx(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-l',
                        complete ? 'bg-accent-signal text-harbor-900' : i === current ? 'bg-white text-harbor-900' : 'bg-white/10 text-white/60'
                      )}
                    >
                      {complete ? <Check size={14} strokeWidth={3} /> : i + 1}
                    </span>
                    <span>
                      <span className={clsx('block text-title-s', i <= reached || done ? 'text-white' : 'text-white/60')}>{s.label}</span>
                      <span className="block text-body-s text-white/50">{s.blurb}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <main className="rounded-[28px] bg-card p-6 shadow-light md:p-10">
          {error && <FormError>{error}</FormError>}
          {!state ? (
            !error && (
              <div className="flex justify-center py-20">
                <Loader2 size={28} className="animate-spin text-icon-brand" />
              </div>
            )
          ) : done ? (
            <Outcome state={state} />
          ) : (
            <>
              {state.status === 'REJECTED' && (
                <div className="mb-6 flex gap-3 rounded-2xl bg-destructive-subtle p-4 text-body-m text-destructive">
                  <CircleAlert size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semi-bold">Your last submission was not approved</p>
                    <p>{state.reviewNote}</p>
                  </div>
                </div>
              )}
              <h2 className="text-headline-m text-text-primary">{STEPS[current].label}</h2>
              <p className="mb-8 mt-1 text-body-m text-text-tertiary">{STEPS[current].blurb}</p>
              {view === 'PERSONAL' && <PersonalStep key={view} state={state} token={token} onSaved={onSaved} />}
              {view === 'IDENTITY' && <IdentityStep key={view} state={state} token={token} onSaved={onSaved} onBack={back} />}
              {view === 'DOCUMENTS' && <DocumentsStep key={view} state={state} token={token} onSaved={onSaved} onBack={back} />}
              {view === 'BANK' && <BankStep key={view} state={state} token={token} onSaved={onSaved} onBack={back} />}
              {view === 'REVIEW' && (
                <ReviewStep key={view} state={state} token={token} onSaved={onSaved} onBack={back} onEdit={goTo} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Outcome({ state }: { state: OnboardingState }) {
  const verified = state.status === 'VERIFIED';
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <span
        className={clsx(
          'flex h-16 w-16 items-center justify-center rounded-full',
          verified ? 'bg-success-subtle text-success-text' : 'bg-warning-subtle text-warning-text'
        )}
      >
        {verified ? <BadgeCheck size={30} /> : <Clock size={30} />}
      </span>
      <h2 className="text-headline-m text-text-primary">{verified ? 'You’re verified' : 'Verification submitted'}</h2>
      <p className="max-w-md text-body-l text-text-secondary">
        {verified
          ? `Your identity and payout account are confirmed. You are now Tier ${state.kycTier?.slice(1)} — you can send and carry on domestic routes.`
          : 'Thanks! A Relay reviewer is checking your details — usually within one business day. We’ll email you when it’s done.'}
      </p>
      <Link
        href={verified ? '/search' : '/'}
        className="mt-2 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-label-l font-semi-bold text-brand-foreground hover:bg-brand-focus"
      >
        {verified ? 'Send your first package' : 'Back to home'} <ArrowRight size={16} className="text-accent-signal" />
      </Link>
      {verified && (
        <Link href="/kyc" className="text-body-m text-text-link hover:underline dark:text-harbor-200">
          Travelling abroad? Upgrade to Tier 2 with your passport
        </Link>
      )}
    </div>
  );
}
