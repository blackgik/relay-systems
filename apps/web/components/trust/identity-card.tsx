'use client';

import React from 'react';
import { BadgeCheck, CalendarDays, Landmark, Lock, MapPin, ShieldAlert, UserRound } from 'lucide-react';
import type { RevealedIdentity } from '@/lib/types';
import { signatureMatches } from '@/lib/declaration';

function age(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  return now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
}

/**
 * The real person on the other side of an accepted leg: KYC name, date of
 * birth, where they live, and their payout account name. If the account name
 * Paystack returned matches the KYC name, that's an independent check that
 * the person is who they say they are. BVN and NIN are never shown.
 */
export function IdentityCard({ identity, role }: { identity: RevealedIdentity; role: 'sender' | 'courier' }) {
  const name = [identity.firstName, identity.middleName, identity.lastName].filter(Boolean).join(' ');
  const bank = identity.bank;
  // Paystack's name is surname-first; compare as a set of name parts.
  const bankAgrees = bank ? bank.nameMatches && signatureMatches(bank.accountName, name) : false;

  return (
    <div className="tr-fade rounded-2xl border border-success/30 bg-success-subtle/40 p-4">
      <p className="flex flex-wrap items-center gap-2 text-[11px] font-semi-bold uppercase tracking-wide text-success-text">
        <BadgeCheck size={14} /> Verified identity of your {role}
        {identity.kycVerified ? '' : ' (KYC pending)'}
      </p>
      <dl className="mt-3 grid gap-3 text-body-s sm:grid-cols-2">
        <div className="flex gap-2">
          <UserRound size={15} className="mt-0.5 shrink-0 text-icon-muted" />
          <div className="min-w-0">
            <dt className="text-text-tertiary">Full name</dt>
            <dd className="break-words font-semi-bold text-text-primary">{name}</dd>
          </div>
        </div>
        <div className="flex gap-2">
          <CalendarDays size={15} className="mt-0.5 shrink-0 text-icon-muted" />
          <div>
            <dt className="text-text-tertiary">Date of birth</dt>
            <dd className="font-semi-bold text-text-primary">
              {identity.dateOfBirth
                ? `${new Date(identity.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · ${age(identity.dateOfBirth)} yrs`
                : 'Not provided'}
            </dd>
          </div>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <MapPin size={15} className="mt-0.5 shrink-0 text-icon-muted" />
          <div className="min-w-0">
            <dt className="text-text-tertiary">Lives at</dt>
            <dd className="break-words font-semi-bold text-text-primary">
              {[identity.address, identity.city, identity.state].filter(Boolean).join(', ') || 'Not provided'}
            </dd>
          </div>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Landmark size={15} className="mt-0.5 shrink-0 text-icon-muted" />
          <div className="min-w-0 flex-1">
            <dt className="text-text-tertiary">Bank account (name check)</dt>
            {bank ? (
              <dd>
                <span className="break-words font-semi-bold text-text-primary">{bank.accountName}</span>
                <span className="text-text-tertiary"> · {bank.bankName} ••••{bank.accountLast4}</span>
                <span
                  className={`mt-1.5 flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semi-bold ${bankAgrees ? 'bg-success-subtle text-success-text' : 'bg-warning-subtle text-warning-text'}`}
                >
                  {bankAgrees ? <BadgeCheck size={12} /> : <ShieldAlert size={12} />}
                  {bankAgrees ? 'Bank account name matches their verified name' : 'Bank name does not match. Confirm their ID at handover.'}
                </span>
              </dd>
            ) : (
              <dd className="text-text-secondary">No payout account on file</dd>
            )}
          </div>
        </div>
      </dl>
      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-text-tertiary">
        <Lock size={12} className="mt-0.5 shrink-0" />
        Shown because this leg was accepted. BVN, NIN and ID numbers are never shared. Use these details only for this delivery.
      </p>
    </div>
  );
}

/** Placeholder before acceptance: says what unlocks, and when. */
export function IdentityLocked({ role }: { role: 'sender' | 'courier' }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border p-4 text-body-s text-text-secondary">
      <Lock size={16} className="mt-0.5 shrink-0 text-icon-muted" />
      <p>
        {role === 'sender'
          ? 'Accept this request to see the sender’s verified name, date of birth, address and bank name check.'
          : 'Once your courier accepts, you’ll see their verified name, date of birth, address and bank name check.'}
      </p>
    </div>
  );
}
