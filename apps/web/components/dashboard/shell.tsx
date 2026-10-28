'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  BadgeCheck,
  Bell,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  HandCoins,
  HelpCircle,
  Info,
  LayoutDashboard,
  LogOut,
  Luggage,
  Mail,
  Menu,
  Moon,
  Package,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Notification } from '@/lib/dashboard-types';
import { Wordmark } from '@/components/marketing/blocks';
import { HandleAvatar } from './widgets';

// ── Role mode ─────────────────────────────────────────────────────────
// One account both sends and carries. The switch changes which side the
// app leads with — a lens over the same account, remembered per device.

export type DashboardMode = 'sender' | 'courier';

const ModeContext = createContext<{ mode: DashboardMode; setMode: (m: DashboardMode) => void }>({
  mode: 'sender',
  setMode: () => undefined,
});

export function useDashboardMode() {
  return useContext(ModeContext);
}

function readStore(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode — preference just won't persist */
  }
}

// ── Navigation ───────────────────────────────────────────────────────

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: number; match?: string };

function NavGroup({ title, items, pathname, onNavigate }: { title: string; items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <div>
      <p className="px-3 text-[11px] font-semi-bold uppercase tracking-[0.12em] text-text-tertiary">{title}</p>
      <ul className="mt-2 space-y-0.5">
        {items.map(({ href, label, icon: Icon, badge, match }) => {
          const active = pathname === href || (!!match && pathname.startsWith(match));
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-body-m transition-colors',
                  active
                    ? 'border border-border/70 bg-card font-semi-bold text-text-brand shadow-light dark:text-white'
                    : 'border border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.3 : 1.9} className={active ? 'text-text-brand dark:text-accent-signal' : ''} />
                <span className="flex-1">{label}</span>
                {!!badge && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-foreground">
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DarkModeSwitch() {
  const [dark, setDark] = useState(false);
  // The shell is the only theme control on signed-in pages, so it restores
  // the saved preference (same key as the marketing ThemeToggle).
  useEffect(() => {
    const initial = readStore('relay-theme') === 'dark';
    document.documentElement.classList.toggle('dark', initial);
    setDark(initial);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    writeStore('relay-theme', next ? 'dark' : 'light');
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-body-m text-text-secondary hover:bg-surface-hover"
    >
      <Moon size={18} />
      <span className="flex-1 text-left">Dark mode</span>
      <span className={clsx('relative h-5 w-9 rounded-full transition-colors', dark ? 'bg-brand' : 'bg-surface-pressed')}>
        <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-toggle-knob transition-all', dark ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

function SidebarSearch({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/dashboard/couriers${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
        onNavigate?.();
      }}
      className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
    >
      <Search size={15} className="text-icon-muted" />
      <label htmlFor="sidebar-search" className="sr-only">
        Search couriers by city or username
      </label>
      <input
        id="sidebar-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="City or @username"
        className="w-full min-w-0 border-0 bg-transparent p-0 text-body-s text-text-primary placeholder:text-text-tertiary focus:ring-0"
      />
    </form>
  );
}

function Sidebar({
  pathname,
  handle,
  requests,
  mode,
  onNavigate,
}: {
  pathname: string;
  handle: string | null;
  requests: number;
  mode: DashboardMode;
  onNavigate?: () => void;
}) {
  const main: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/couriers', label: 'Courier board', icon: Users },
    { href: '/search', label: 'Send a package', icon: Send },
    { href: '/shipments', label: 'My shipments', icon: Package, match: '/shipments' },
    { href: '/trips', label: 'My trips', icon: Truck, match: '/trips' },
    { href: '/requests', label: 'Carry requests', icon: Luggage, badge: requests, match: '/legs' },
    { href: '/wallet', label: 'Wallet', icon: Wallet },
  ];
  const account: NavItem[] = [
    ...(handle ? [{ href: `/dashboard/people/${handle}`, label: 'My public profile', icon: UserRound }] : []),
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    { href: '/kyc', label: 'Verification', icon: ShieldCheck, match: '/onboarding' },
  ];
  const support: NavItem[] = [
    { href: '/faq', label: 'Help & FAQ', icon: HelpCircle },
    { href: '/contact', label: 'Contact us', icon: Mail },
  ];

  return (
    <div className="flex h-full flex-col px-3 py-5">
      <Link href="/dashboard" onClick={onNavigate} className="px-3" aria-label="Relay dashboard">
        <Wordmark className="text-[24px]" />
      </Link>
      <div className="mt-5">
        <SidebarSearch onNavigate={onNavigate} />
      </div>
      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto" aria-label="App">
        <NavGroup title="Main menu" items={main} pathname={pathname} onNavigate={onNavigate} />
        <NavGroup title="Account" items={account} pathname={pathname} onNavigate={onNavigate} />
        <NavGroup title="Support" items={support} pathname={pathname} onNavigate={onNavigate} />
      </nav>

      <div className="relative mt-4 hidden overflow-hidden rounded-2xl border border-border/70 bg-card p-4 [@media(min-height:860px)]:block">
        <div aria-hidden className="absolute inset-x-0 top-0 h-16 bg-gradient-to-br from-brand-subtle via-accent-signal/20 to-transparent" />
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-accent-signal">
          {mode === 'sender' ? <HandCoins size={18} /> : <Package size={18} />}
        </span>
        <p className="relative mt-3 text-title-s text-text-primary">
          {mode === 'sender' ? 'Travelling soon?' : 'Need something moved?'}
        </p>
        <p className="relative mt-0.5 text-body-s text-text-tertiary">
          {mode === 'sender' ? 'List your spare bag space and earn per kilo.' : 'Book space with a verified courier.'}
        </p>
        <Link
          href={mode === 'sender' ? '/trips/new' : '/search'}
          onClick={onNavigate}
          className="relative mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-body-s font-semi-bold text-text-primary hover:bg-surface"
        >
          {mode === 'sender' ? <Truck size={14} /> : <Send size={14} />}
          {mode === 'sender' ? 'Post a trip' : 'Send a package'}
        </Link>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <DarkModeSwitch />
      </div>
    </div>
  );
}

// ── Notifications ────────────────────────────────────────────────────

const TONE_ICON = {
  info: { icon: Info, className: 'bg-info-subtle text-info-text' },
  success: { icon: CircleCheck, className: 'bg-success-subtle text-success-text' },
  warning: { icon: CircleAlert, className: 'bg-warning-subtle text-warning-text' },
  danger: { icon: CircleAlert, className: 'bg-destructive-subtle text-destructive' },
};

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

function NotificationBell({ notes }: { notes: Notification[] }) {
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const close = useCallback(() => setOpen(false), []);
  const ref = useOutsideClose(open, close);

  useEffect(() => setSeenAt(Number(readStore('relay-notes-seen') ?? 0)), []);
  const unread = notes.filter((n) => new Date(n.at).getTime() > seenAt).length;

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) {
      const now = Date.now();
      writeStore('relay-notes-seen', String(now));
      // Keep the dots for this viewing; they clear next time.
      setTimeout(() => setSeenAt(now), 1500);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-text-secondary transition-colors hover:text-text-primary"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-signal px-1 text-[10px] font-bold text-harbor-900 ring-2 ring-background">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-dropdown mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-popover shadow-2lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-title-s text-text-primary">Notifications</p>
            <span className="text-body-s text-text-tertiary">{notes.length ? `Last 30 days` : ''}</span>
          </div>
          {notes.length === 0 ? (
            <EmptyState art="inbox" size="sm" tone="plain" title="You’re all caught up" body="Requests, payouts and shipment updates show up here." />
          ) : (
            <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
              {notes.map((n) => {
                const tone = TONE_ICON[n.tone];
                const fresh = new Date(n.at).getTime() > seenAt;
                return (
                  <li key={n.id}>
                    <Link href={n.href} onClick={close} className="flex gap-3 px-4 py-3 hover:bg-surface-hover">
                      <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', tone.className)}>
                        <tone.icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-body-s font-semi-bold text-text-primary">
                          {n.title}
                          {fresh && <span className="h-1.5 w-1.5 rounded-full bg-accent-signal" aria-label="unread" />}
                        </span>
                        <span className="mt-0.5 block text-body-s text-text-secondary">{n.body}</span>
                        <span className="mt-1 block text-[11px] text-text-tertiary">{timeAgo(n.at)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useOutsideClose(open, close);
  if (!user) return null;
  const handle = user.handle ?? 'you';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 hover:bg-surface-hover"
      >
        <HandleAvatar handle={handle} size={30} className="rounded-full" />
        <span className="hidden text-left leading-tight md:block">
          <span className="flex items-center gap-1 text-body-s font-semi-bold text-text-primary">
            @{handle} {user.kycTier !== 'T0' && <BadgeCheck size={13} className="text-text-brand dark:text-harbor-200" />}
          </span>
          <span className="block text-[11px] text-text-tertiary">Tier {user.kycTier.slice(1)}</span>
        </span>
        <ChevronDown size={15} className="text-icon-muted" />
      </button>
      {open && (
        <div className="absolute right-0 z-dropdown mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-2lg">
          <div className="px-3 py-2">
            <p className="text-body-s font-semi-bold text-text-primary">{user.fullName}</p>
            <p className="truncate text-[12px] text-text-tertiary">{user.email}</p>
            <p className="mt-1 text-[11px] text-text-tertiary">Only you see your real name. Others see @{handle}.</p>
          </div>
          <div className="my-1 border-t border-border" />
          {[
            { href: `/dashboard/people/${handle}`, label: 'View public profile', icon: UserRound },
            { href: '/dashboard/settings', label: 'Settings', icon: Settings },
            { href: '/wallet', label: 'Wallet', icon: Wallet },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={close} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-body-s text-text-secondary hover:bg-surface-hover hover:text-text-primary">
              <Icon size={15} /> {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-body-s text-destructive hover:bg-destructive-subtle"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function RoleSwitch({ mode, setMode }: { mode: DashboardMode; setMode: (m: DashboardMode) => void }) {
  return (
    <div role="radiogroup" aria-label="View as" className="flex items-center rounded-full border border-border bg-surface p-1">
      {(['sender', 'courier'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => setMode(m)}
          className={clsx(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-s font-semi-bold capitalize transition-all',
            mode === m ? 'bg-brand text-brand-foreground shadow-light' : 'text-text-tertiary hover:text-text-primary'
          )}
        >
          {m === 'sender' ? <Package size={14} /> : <Truck size={14} />}
          <span className="hidden sm:inline">{m}</span>
        </button>
      ))}
    </div>
  );
}

const TITLES: [string, string][] = [
  ['/dashboard/couriers', 'Courier board'],
  ['/dashboard/people', 'Profile'],
  ['/dashboard/settings', 'Settings'],
  ['/dashboard', 'Dashboard'],
  ['/search', 'Send a package'],
  ['/shipments', 'My shipments'],
  ['/trips', 'My trips'],
  ['/carry', 'Carry'],
  ['/requests', 'Carry requests'],
  ['/legs', 'Leg workspace'],
  ['/wallet', 'Wallet'],
  ['/kyc', 'Verification'],
  ['/admin', 'Operations'],
];

// ── Shell ─────────────────────────────────────────────────────────────

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const pathname = usePathname() ?? '/dashboard';
  const [mode, setModeState] = useState<DashboardMode>('sender');
  const [drawer, setDrawer] = useState(false);
  const [notes, setNotes] = useState<Notification[]>([]);

  useEffect(() => {
    const saved = readStore('relay-mode');
    if (saved === 'courier' || saved === 'sender') setModeState(saved);
  }, []);
  const setMode = useCallback((m: DashboardMode) => {
    setModeState(m);
    writeStore('relay-mode', m);
  }, []);

  useEffect(() => {
    if (!token) return;
    const load = () =>
      api<Notification[]>('/dashboard/notifications', { token })
        .then(setNotes)
        .catch(() => undefined);
    void load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [token]);

  useEffect(() => setDrawer(false), [pathname]);

  const requests = notes.filter((n) => n.kind === 'REQUEST').length;
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? 'Relay';
  const firstName = user?.fullName.split(' ')[0];

  const sidebar = (
    <Sidebar pathname={pathname} handle={user?.handle ?? null} requests={requests} mode={mode} onNavigate={() => setDrawer(false)} />
  );

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      <div className="flex min-h-screen bg-surface">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/70 bg-surface lg:block">{sidebar}</aside>

        {drawer && (
          <div className="fixed inset-0 z-modal lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-overlay/50" onClick={() => setDrawer(false)} />
            <aside className="relative h-full w-72 max-w-[85vw] animate-drawer-in bg-surface shadow-2lg">
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover"
              >
                <X size={18} />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-sticky border-b border-border/70 bg-surface/90 backdrop-blur">
            <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
              <button
                type="button"
                onClick={() => setDrawer(true)}
                aria-label="Open menu"
                className="flex h-10 w-10 items-center justify-center rounded-full text-text-primary hover:bg-surface-hover lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-title-base text-text-primary">
                  {pathname === '/dashboard' && firstName ? `Welcome in, ${firstName}` : title}
                </h1>
                <p className="hidden text-[12px] text-text-tertiary sm:block">
                  {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <RoleSwitch mode={mode} setMode={setMode} />
                <Link
                  href={mode === 'sender' ? '/search' : '/trips/new'}
                  className="hidden items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-body-s font-semi-bold text-brand-foreground hover:bg-brand-focus md:inline-flex"
                >
                  {mode === 'sender' ? <Send size={14} className="text-accent-signal" /> : <Truck size={14} className="text-accent-signal" />}
                  {mode === 'sender' ? 'Send package' : 'Post a trip'}
                </Link>
                <NotificationBell notes={notes} />
                <AccountMenu />
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </ModeContext.Provider>
  );
}
