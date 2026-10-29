'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { FileSignature, Gavel, ShieldAlert } from 'lucide-react';
import { Button, Input, Modal, ModalHeader } from '@/ui/elements';
import { ApiError, api } from '@/lib/api';
import type { DeclarationStatement } from '@/lib/types';
import { SIGNATURE_FONT, signatureMatches } from '@/lib/declaration';

export interface SignedDeclaration {
  accepted: true;
  signedName: string;
  statementVersion: string;
}

type Statement = DeclarationStatement & { signAs: string };

/** The wording a sender signs, fetched once per open. */
export function useDeclarationStatement(token: string | null, enabled = true) {
  const [statement, setStatement] = useState<Statement | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || !token || statement) return;
    api<Statement>('/attestations/statement', { token })
      .then(setStatement)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load the declaration'));
  }, [token, enabled, statement]);
  return { statement, error };
}

/**
 * The liability step before a request is sent: the sender reads the
 * declaration, ticks that they accept criminal responsibility for the
 * contents, and signs with their legal name. Confirming creates the request
 * and the A4 declaration both parties can download.
 */
export function DeclarationPanel({
  statement,
  loadError,
  summary,
  busy,
  error,
  onBack,
  onConfirm,
}: {
  statement: Statement | null;
  loadError?: string | null;
  /** One line about what is being sent, e.g. "2.5 kg of fabric · Awka → Abuja with @willow-raven-90". */
  summary: React.ReactNode;
  busy: boolean;
  error?: string | null;
  onBack: () => void;
  onConfirm: (signed: SignedDeclaration) => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState('');
  const top = useRef<HTMLDivElement>(null);
  // The modal keeps the details step's scroll position; start at the warning instead.
  useEffect(() => top.current?.scrollIntoView?.({ block: 'start' }), []);
  const matches = !!statement && signatureMatches(name, statement.signAs);
  const showMismatch = name.trim().split(/\s+/).length >= 2 && !matches;

  return (
    <div ref={top} className="flex flex-col gap-4 px-5 py-5 md:px-6">
      <div role="alert" className="flex gap-3 rounded-2xl bg-destructive-subtle p-4 text-destructive">
        <ShieldAlert size={22} className="mt-0.5 shrink-0" aria-hidden />
        <div>
          <p className="text-body-m font-semi-bold">You are legally responsible for this package</p>
          <p className="mt-1 text-body-s">
            Any criminal act connected to the contents of this package will be borne by you, the sender — not the courier who
            carries it in good faith, and not Relay. Read the declaration below before you sign.
          </p>
        </div>
      </div>

      <p className="text-body-s text-text-secondary">{summary}</p>

      {!statement ? (
        loadError ? (
          <p role="alert" className="rounded-xl bg-destructive-subtle px-4 py-3 text-body-s font-medium text-destructive">{loadError}</p>
        ) : (
          <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-label="Loading declaration" />
        )
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="flex items-center gap-2 text-body-s font-semi-bold uppercase tracking-wide text-text-tertiary">
              <FileSignature size={15} aria-hidden /> Declaration of lawful goods
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-body-s text-text-primary">
              {statement.senderClauses.map((c) => <li key={c}>{c}</li>)}
            </ol>
            <p className="mt-4 flex items-center gap-2 text-body-s font-semi-bold uppercase tracking-wide text-text-tertiary">
              <Gavel size={15} aria-hidden /> What binds the courier
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-body-s text-text-secondary">
              {statement.courierClauses.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <p className="mt-3 text-[11px] text-text-tertiary">Statement version {statement.version}</p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3 text-body-s text-text-primary">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>
              I attest that the goods I am handing over are not incriminating, and I accept full criminal and civil responsibility for
              the contents of this package.
            </span>
          </label>

          <div>
            <Input
              name="signedName"
              id="declaration-signature"
              label="Sign with your full legal name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              errorMessage={showMismatch ? `Type your name as verified on Relay: ${statement.signAs}` : undefined}
              infoMessage={showMismatch ? undefined : `As verified on Relay: ${statement.signAs}`}
            />
            <div
              aria-hidden
              className={clsx(
                'mt-2 flex h-16 items-end border-b-2 border-dashed px-2 pb-1 text-[30px] leading-none transition-colors',
                matches ? 'border-success text-text-primary' : 'border-border text-text-tertiary'
              )}
              style={{ fontFamily: SIGNATURE_FONT }}
            >
              {name.trim() || 'Your signature'}
            </div>
          </div>
        </>
      )}

      {error && <p role="alert" className="rounded-xl bg-destructive-subtle px-4 py-3 text-body-s font-medium text-destructive">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button label="Back" variant="secondary" fit onClick={onBack} disabled={busy} />
        <Button
          label={busy ? 'Sending…' : 'Sign & confirm request'}
          fit
          disabled={busy || !statement || !accepted || !matches}
          onClick={() => statement && onConfirm({ accepted: true, signedName: name.trim(), statementVersion: statement.version })}
        />
      </div>
    </div>
  );
}

/** The same step as its own modal, for flows that have no modal of their own (the route wizard). */
export function DeclarationModal({
  open,
  token,
  summary,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  token: string | null;
  summary: React.ReactNode;
  busy: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (signed: SignedDeclaration) => void;
}) {
  const { statement, error: loadError } = useDeclarationStatement(token, open);
  return (
    <Modal isOpen={open} closeModal={busy ? () => undefined : onClose}>
      <div className="w-full max-w-[600px] text-left md:w-[600px]">
        <ModalHeader title="Sign the declaration" subtitle="Required before any courier sees your request" onClose={onClose} />
        {open && (
          <DeclarationPanel statement={statement} loadError={loadError} summary={summary} busy={busy} error={error} onBack={onClose} onConfirm={onConfirm} />
        )}
      </div>
    </Modal>
  );
}
