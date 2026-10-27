'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AtSign, EyeOff, ShieldCheck, Shuffle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { Card, HandleAvatar } from '@/components/dashboard/widgets';
import { FormError } from '@/components/auth/fields';

const ADJ = ['swift', 'quiet', 'amber', 'north', 'steady', 'bright', 'calm', 'brave', 'silver', 'copper', 'velvet', 'olive'];
const NOUN = ['fox', 'hawk', 'otter', 'lynx', 'heron', 'falcon', 'crane', 'egret', 'kudu', 'finch', 'raven', 'orca'];
const suggest = () =>
  `${ADJ[Math.floor(Math.random() * ADJ.length)]}-${NOUN[Math.floor(Math.random() * NOUN.length)]}-${10 + Math.floor(Math.random() * 90)}`;

export default function Settings() {
  const { user, token, loading, refreshUser } = useRequireAuth();
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.handle) setHandle(user.handle);
  }, [user?.handle]);

  if (!loading && !user) return null;
  if (!user) return null;

  const clean = handle.trim().toLowerCase();
  const unchanged = clean === user.handle;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api('/me/handle', { method: 'PATCH', body: { handle: clean }, token });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your username');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid max-w-5xl gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Card title="Public username" sub="How senders and couriers see you everywhere on Relay">
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-4 rounded-2xl bg-surface p-4">
            <HandleAvatar handle={clean || 'you'} size={56} />
            <div>
              <p className="text-title-m text-text-primary">@{clean || 'username'}</p>
              <p className="text-body-s text-text-tertiary">Preview of your public card</p>
            </div>
          </div>
          <FormError>{error}</FormError>
          {saved && <p className="rounded-xl bg-success-subtle px-4 py-3 text-body-m text-success-text">Saved. Everyone now sees you as @{user.handle}.</p>}
          <label className="block">
            <span className="text-label-l text-text-primary">Username</span>
            <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 focus-within:border-brand focus-within:bg-background">
              <AtSign size={16} className="text-icon-muted" />
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                maxLength={20}
                className="h-14 w-full border-0 bg-transparent p-0 text-body-l text-text-primary focus:ring-0"
                aria-describedby="handle-hint"
              />
              <button
                type="button"
                onClick={() => setHandle(suggest())}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-body-s font-medium text-text-link hover:bg-surface-hover dark:text-harbor-200"
              >
                <Shuffle size={14} /> Suggest
              </button>
            </span>
            <span id="handle-hint" className="mt-1.5 block text-body-s text-text-tertiary">
              3–20 lowercase letters, numbers or dashes. It can’t include your real name.
            </span>
          </label>
          <button
            type="submit"
            disabled={busy || unchanged || clean.length < 3}
            className="h-12 rounded-xl bg-brand px-6 text-title-s text-brand-foreground hover:bg-brand-focus disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save username'}
          </button>
        </form>
      </Card>

      <Card title="Why a username?">
        <ul className="space-y-4 text-body-s text-text-secondary">
          <li className="flex gap-3">
            <EyeOff size={18} className="mt-0.5 shrink-0 text-icon-brand dark:text-harbor-200" />
            Couriers post where and when they travel. Showing real names would let strangers follow someone, so the board,
            Top 20 and profiles only ever show usernames.
          </li>
          <li className="flex gap-3">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-icon-brand dark:text-harbor-200" />
            Your real identity is still verified with NIN, BVN and ID — Relay knows who you are; other users just see the
            badge.
          </li>
        </ul>
        <Link href={`/dashboard/people/${user.handle}`} className="mt-5 inline-block text-body-s font-semi-bold text-text-link hover:underline dark:text-harbor-200">
          See your public profile →
        </Link>
      </Card>
    </div>
  );
}
