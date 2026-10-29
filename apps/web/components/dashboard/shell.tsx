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
  Wallet,
  X,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Notification } from '@/lib/dashboard-types';
import { deliveryCounts } from '@/lib/deliveries';
import { Wordmark } from '@/components/marketing/blocks';
import { HandleAvatar } from './widgets';
import { Tooltip } from '@/ui/elements';

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

// The shell already polls notifications; pages read them from here rather
// than fetching again (the Deliveries tab counts, for one).
const NotesContext = createContext<{ notes: Notification[]; refresh: () => void }>({ notes: [], refresh: () => undefined });

export function useShellNotes() {
  return useContext(NotesContext);
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

/** Collapsed rail: the page name shows in a tooltip beside the icon (portalled, so the scrolling nav can't clip it). */
function RailTip({ collapsed, label, children }: { collapsed: boolean; label: React.ReactNode; children: React.ReactNode }) {
  if (!collapsed) return <>{children}</>;
  return (
    <Tooltip content={label} placement="right" noWrap wrapperStyle="flex w-full">
      {children}
    </Tooltip>
  );
}

function NavGroup({
  title,
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div>
      {collapsed ? (
        <span aria-hidden className="mx-auto block h-px w-6 bg-border" />
      ) : (
        <p className="px-3 text-[11px] font-semi-bold uppercase tracking-[0.12em] text-text-tertiary">{title}</p>
      )}
      <ul className="mt-2 space-y-0.5" aria-label={collapsed ? title : undefined}>
        {items.map(({ href, label, icon: Icon, badge, match }) => {
          const active = pathname === href || (!!match && pathname.startsWith(match));
          return (
            <li key={href}>
              <RailTip collapsed={collapsed} label={badge ? `${label} · ${badge} waiting` : label}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  aria-label={collapsed ? (badge ? `${label}, ${badge} waiting` : label) : undefined}
                  className={clsx(
                    'relative flex w-full items-center rounded-xl py-2 text-body-m transition-colors',
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                    active
                      ? 'border border-border/70 bg-card font-semi-bold text-text-brand shadow-light dark:text-white'
                      : 'border border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.3 : 1.9} className={clsx('shrink-0', active && 'text-text-brand dark:text-accent-signal')} />
                  {!collapsed && <span className="flex-1 truncate">{label}</span>}
                  {!!badge &&
                    (collapsed ? (
                      <span className="absolute right-2 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground ring-2 ring-surface">
                        {badge}
                      </span>
                    ) : (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-foreground">
                        {badge}
                      </span>
                    ))}
                </Link>
              </RailTip>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DarkModeSwitch({ collapsed = false }: { collapsed?: boolean }) {
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
  if (collapsed) {
    return (
      <RailTip collapsed label={dark ? 'Dark mode: on' : 'Dark mode: off'}>
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          aria-label="Dark mode"
          onClick={toggle}
          className={clsx('flex w-full items-center justify-center rounded-xl py-2 transition-colors hover:bg-surface-hover', dark ? 'text-accent-signal' : 'text-text-secondary')}
        >
          <Moon size={18} className={dark ? 'fill-current' : ''} />
        </button>
      </RailTip>
    );
  }
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
        router.push(`/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
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
  deliveries,
  mode,
  collapsed = false,
  onToggle,
  onNavigate,
}: {
  pathname: string;
  handle: string | null;
  deliveries: number;
  /** Desktop only: icons with tooltips instead of labels. */
  collapsed?: boolean;
  onToggle?: () => void;
  mode: DashboardMode;
  onNavigate?: () => void;
}) {
  const main: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/search', label: 'Send a package', icon: Send, match: '/dashboard/couriers' },
    { href: '/deliveries', label: 'Deliveries', icon: Package, badge: deliveries, match: '/deliveries' },
    { href: '/trips', label: 'My trips', icon: Truck, match: '/trips' },
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
    <div className={clsx('flex h-full flex-col py-5', collapsed ? 'px-2.5' : 'px-3')}>
      <div className={clsx('flex items-center', collapsed ? 'flex-col gap-3' : 'justify-between gap-2 pr-1')}>
        <Link href="/dashboard" onClick={onNavigate} className={collapsed ? '' : 'px-3'} aria-label="Relay dashboard">
          {collapsed ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-[20px] font-extra-bold text-brand-foreground">
              r<span className="text-accent-signal">.</span>
            </span>
          ) : (
            <Wordmark className="text-[24px]" />
          )}
        </Link>
        {onToggle && (
          <RailTip collapsed={collapsed} label="Expand menu">
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
              aria-expanded={!collapsed}
              title={collapsed ? undefined : 'Collapse menu  (Ctrl + B)'}
              className={clsx('flex h-9 items-center justify-center rounded-xl text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary', collapsed ? 'w-full' : 'w-9')}
            >
              {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
          </RailTip>
        )}
      </div>
      <div className="mt-5">
        {collapsed ? (
          <RailTip collapsed label="Search couriers & cities">
            <Link
              href="/search"
              aria-label="Search couriers and cities"
              className="flex w-full items-center justify-center rounded-xl border border-border bg-card py-2 text-text-secondary hover:text-text-primary"
            >
              <Search size={17} />
            </Link>
          </RailTip>
        ) : (
          <SidebarSearch onNavigate={onNavigate} />
        )}
      </div>
      <nav className={clsx('mt-6 flex-1 space-y-6 overflow-y-auto', collapsed && 'overflow-x-hidden')} aria-label="App">
        <NavGroup title="Main menu" items={main} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
        <NavGroup title="Account" items={account} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
        <NavGroup title="Support" items={support} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
      </nav>

      <div className={clsx('relative mt-4 hidden overflow-hidden rounded-2xl border border-border/70 bg-card p-4', !collapsed && '[@media(min-height:860px)]:block')}>
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
          href={mode === 'sender' ? '/trips?new=1' : '/search'}
          onClick={onNavigate}
          className="relative mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-body-s font-semi-bold text-text-primary hover:bg-surface"
        >
          {mode === 'sender' ? <Truck size={14} /> : <Send size={14} />}
          {mode === 'sender' ? 'Post a trip' : 'Send a package'}
        </Link>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <DarkModeSwitch collapsed={collapsed} />
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
  ['/dashboard/couriers', 'Send a package'],
  ['/dashboard/people', 'Profile'],
  ['/dashboard/settings', 'Settings'],
  ['/dashboard', 'Dashboard'],
  ['/search', 'Send a package'],
  ['/deliveries', 'Deliveries'],
  ['/shipments', 'Deliveries'],
  ['/trips', 'My trips'],
  ['/carry', 'Carry'],
  ['/requests', 'Deliveries'],
  ['/legs', 'Deliveries'],
  ['/wallet', 'Wallet'],
  ['/kyc', 'Verification'],
  ['/admin', 'Operations'],
];

// ── Shell ─────────────────────────────────────────────────────────────

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const pathname = usePathname() ?? '/dashboard';
  const router = useRouter();
  const [mode, setModeState] = useState<DashboardMode>('sender');
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // Animate the width only for clicks, not when restoring the saved state on load.
  const [railMotion, setRailMotion] = useState(false);
  const [notes, setNotes] = useState<Notification[]>([]);

  // The rail stays the way you left it on this device.
  useEffect(() => {
    setCollapsed(readStore('relay-sidebar') === 'collapsed');
    const id = requestAnimationFrame(() => setRailMotion(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const toggleSidebar = useCallback(() => {
    setCollapsed((c) => {
      writeStore('relay-sidebar', c ? 'expanded' : 'collapsed');
      return !c;
    });
  }, []);
  // Ctrl/⌘ + B toggles it, like most editors (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        const t = e.target as HTMLElement | null;
        if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar]);

  // Restore the remembered role, unless the page says which side you're on
  // (Deliveries → Carrying is the courier side, Sending the sender side).
  useEffect(() => {
    const fromUrl = pathname.startsWith('/deliveries/carrying') ? 'courier' : pathname.startsWith('/deliveries/sending') ? 'sender' : null;
    const saved = fromUrl ?? readStore('relay-mode');
    if (saved === 'courier' || saved === 'sender') setModeState(saved);
    if (fromUrl) writeStore('relay-mode', fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setMode = useCallback((m: DashboardMode) => {
    setModeState(m);
    writeStore('relay-mode', m);
  }, []);

  const reloadNotes = useCallback(() => {
    if (!token) return;
    api<Notification[]>('/dashboard/notifications', { token })
      .then(setNotes)
      .catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    reloadNotes();
    const t = setInterval(reloadNotes, 60_000);
    // Pages that change what's waiting (accepting or declining a carry
    // request, paying) ask for a refresh, so badges never lag behind.
    window.addEventListener('relay:requests-changed', reloadNotes);
    return () => {
      clearInterval(t);
      window.removeEventListener('relay:requests-changed', reloadNotes);
    };
  }, [token, reloadNotes]);

  useEffect(() => setDrawer(false), [pathname]);

  const counts = deliveryCounts(notes);

  // A deliberate flip of the role switch on Deliveries takes you to that side.
  const switchRole = useCallback(
    (m: DashboardMode) => {
      setMode(m);
      if (pathname.startsWith('/deliveries')) router.push(m === 'courier' ? '/deliveries/carrying' : '/deliveries/sending', { scroll: false });
    },
    [setMode, pathname, router]
  );
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? 'Relay';
  const firstName = user?.fullName.split(' ')[0];

  const sidebarProps = { pathname, handle: user?.handle ?? null, deliveries: counts.carrying + counts.sending, mode };
  // The phone drawer always shows full labels; only the desktop rail collapses.
  const sidebar = <Sidebar {...sidebarProps} onNavigate={() => setDrawer(false)} />;

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      <NotesContext.Provider value={{ notes, refresh: reloadNotes }}>
      <div className="flex min-h-screen bg-surface">
        <aside
          className={clsx(
            'sticky top-0 hidden h-screen shrink-0 border-r border-border/70 bg-surface lg:block',
            railMotion && 'transition-[width] duration-300 ease-out motion-reduce:transition-none',
            collapsed ? 'w-[76px]' : 'w-64'
          )}
        >
          <Sidebar {...sidebarProps} collapsed={collapsed} onToggle={toggleSidebar} />
        </aside>

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
                <RoleSwitch mode={mode} setMode={switchRole} />
                <Link
                  href={mode === 'sender' ? '/search' : '/trips?new=1'}
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
      </NotesContext.Provider>
    </ModeContext.Provider>
  );
}
