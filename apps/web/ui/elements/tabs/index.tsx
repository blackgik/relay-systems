'use client';

import clsx from 'clsx';
import React, { createContext, useContext, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ── Context ───────────────────────────────────────────────────────────────────
interface TabsCtx {
  active:    string;
  setActive: (id: string) => void;
  variant:   TabsVariant;
}

const Ctx = createContext<TabsCtx>({
  active:    '',
  setActive: () => {},
  variant:   'underline',
});

const useTabs = () => useContext(Ctx);

// ── Types ─────────────────────────────────────────────────────────────────────
export type TabsVariant = 'underline' | 'pill' | 'chip';

export interface TabsRootProps {
  /** ID of the initially selected tab */
  defaultTab?:  string;
  /**
   * Controlled active tab. When provided, the tab strip reflects this value instead of its
   * own state and `onChange` is the only way it moves — used by pages that keep the active
   * tab in the URL so a deep link (a notification, a shared link) can land on a given tab.
   */
  activeTab?:   string;
  /** underline — bottom-border indicator (default) · pill — background chip */
  variant?:     TabsVariant;
  onChange?:    (id: string) => void;
  children:     React.ReactNode;
  className?:   string;
}

export interface TabListProps {
  children:   React.ReactNode;
  className?: string;
}

export interface TabProps {
  /** Must match the id used in the corresponding TabPanel */
  id:          string;
  children:    React.ReactNode;
  disabled?:   boolean;
  className?:  string;
  /** Optional left icon */
  icon?:       React.ReactNode;
  /** Optional badge/count chip */
  badge?:      React.ReactNode;
}

export interface TabPanelProps {
  /** Must match the id used in the corresponding Tab */
  id:          string;
  children:    React.ReactNode;
  className?:  string;
}

// ── Root ──────────────────────────────────────────────────────────────────────
/**
 * Tabs — accessible tabbed interface.
 *
 * @example
 * <Tabs defaultTab="overview" variant="underline">
 *   <TabList>
 *     <Tab id="overview">Overview</Tab>
 *     <Tab id="details">Details</Tab>
 *   </TabList>
 *   <TabPanel id="overview"><p>Overview content</p></TabPanel>
 *   <TabPanel id="details"><p>Details content</p></TabPanel>
 * </Tabs>
 */
export function Tabs({
  defaultTab = '',
  activeTab,
  variant = 'underline',
  onChange,
  children,
  className,
}: TabsRootProps) {
  const [uncontrolledActive, setActiveState] = useState(defaultTab);
  const isControlled = activeTab !== undefined;
  const active = isControlled ? activeTab : uncontrolledActive;

  const setActive = (id: string) => {
    if (!isControlled) setActiveState(id);
    onChange?.(id);
  };

  return (
    <Ctx.Provider value={{ active, setActive, variant }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

// ── Tab list ──────────────────────────────────────────────────────────────────
export function TabList({ children, className }: TabListProps) {
  const { variant } = useTabs();

  return (
    <div
      role="tablist"
      className={clsx(
        // Scrolls rather than wraps. Tabs are `shrink-0 whitespace-nowrap`, so
        // a strip too narrow for its labels slides sideways instead of letting
        // two-word labels break across lines — "Sales History" over two rows
        // reads as two tabs.
        'no-scrollbar flex overflow-x-auto',
        variant === 'underline' && 'gap-0 border-b border-border',
        variant === 'pill'      && 'gap-1 rounded-xl bg-muted p-1',
        variant === 'chip'      && 'gap-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
export function Tab({ id, children, disabled, icon, badge, className }: TabProps) {
  const { active, setActive, variant } = useTabs();
  const isActive = active === id;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      id={`tab-${id}`}
      disabled={disabled}
      onClick={() => !disabled && setActive(id)}
      className={clsx(
        // text-title-s sets size; weight is omitted here — defaultWeight['title-s'] = 'medium' applies automatically
        'inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-title-s transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-40',
        // underline variant
        variant === 'underline' && [
          'border-b-2 px-4 py-2.5 -mb-px',
          isActive
            ? 'border-brand text-brand font-semi-bold'
            : 'border-transparent text-text-secondary hover:border-border hover:text-brand',
        ],
        // pill variant
        variant === 'pill' && [
          'rounded-lg px-3 py-1.5',
          isActive
            ? 'bg-background text-foreground font-semi-bold shadow-sm'
            : 'text-text-secondary hover:text-brand',
        ],
        // chip variant — only the active tab gets a colored chip; inactive
        // tabs stay plain text with no wrapping/background of their own.
        variant === 'chip' && [
          'rounded-full px-3 py-1.5',
          isActive
            ? 'bg-brand/10 text-brand font-semi-bold'
            : 'text-muted-foreground hover:text-brand',
        ],
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
      {badge && <span className="shrink-0">{badge}</span>}
    </button>
  );
}

// ── Tab panel ─────────────────────────────────────────────────────────────────
export function TabPanel({ id, children, className }: TabPanelProps) {
  const { active } = useTabs();
  if (active !== id) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={clsx('outline-none', className)}
    >
      {children}
    </div>
  );
}

export default Tabs;

// ── RouteAwareTabs ────────────────────────────────────────────────────────────
/**
 * Route-aware tab list. Each item renders as a Next.js Link.
 * Active state is derived from the current pathname, not local state.
 *
 * @example
 * <RouteAwareTabs
 *   variant="underline"
 *   items={[
 *     { href: '/user/dashboard/inventory/overview',  label: 'Overview'  },
 *     { href: '/user/dashboard/inventory/purchases', label: 'Purchases' },
 *     { href: '/user/dashboard/inventory/stocks',    label: 'Stocks'    },
 *   ]}
 * />
 */

export interface RouteAwareTabItem {
  href: string;
  label: string;
  badge?: number;
  /** Small unread/attention dot after the label. Ignored when badge is set. */
  dot?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface RouteAwareTabsProps {
  items: RouteAwareTabItem[];
  variant?: TabsVariant;
  className?: string;
  listClassName?: string;
  /**
   * Controls how the active tab is matched against the current pathname.
   * - 'exact'      — tab is active only when pathname === item.href (default)
   * - 'startsWith' — tab is active when pathname starts with item.href.
   *                  Use for catch-all routes where the active segment is a prefix.
   * @default 'exact'
   */
  matchMode?: 'exact' | 'startsWith';
  /**
   * When provided, RouteAwareTabs renders the panel whose index matches the
   * active tab directly below the tab list. The panel at the same index as
   * the active tab is shown. Use when panel content can be colocated with the
   * tab list instead of relying on nested Next.js route rendering.
   */
  panels?: React.ReactNode[];
}

export function RouteAwareTabs({
  items,
  variant = 'underline',
  className,
  listClassName,
  matchMode = 'exact',
  panels,
}: RouteAwareTabsProps) {
  const pathname = usePathname();

  const activeIndex = items.findIndex((item) => {
    if (matchMode === 'startsWith') {
      return pathname === item.href || pathname.startsWith(item.href + '/');
    }
    return pathname === item.href;
  });

  return (
    <div className={className}>
      <div
        role="tablist"
        className={clsx(
          'flex',
          variant === 'underline' && 'gap-0 border-b border-border',
          variant === 'pill'      && 'gap-1 rounded-xl bg-muted p-1',
          listClassName,
        )}
      >
        {items.map((item) => {
          const isActive =
            matchMode === 'startsWith'
              ? pathname === item.href || pathname.startsWith(item.href + '/')
              : pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`route-tab-${item.href.replace(/\//g, '-')}`}
              role="tab"
              aria-selected={isActive}
              aria-disabled={item.disabled}
              className={clsx(
                'inline-flex items-center gap-2 text-title-s transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
                item.disabled && 'pointer-events-none cursor-not-allowed opacity-40',
                // underline variant
                variant === 'underline' && [
                  'border-b-2 px-4 py-2.5 -mb-px',
                  isActive
                    ? 'border-brand text-brand font-semi-bold'
                    : 'border-transparent text-text-secondary hover:border-border hover:text-brand',
                ],
                // pill variant
                variant === 'pill' && [
                  'rounded-lg px-3 py-1.5',
                  isActive
                    ? 'bg-background text-foreground font-semi-bold shadow-sm'
                    : 'text-text-secondary hover:text-brand',
                ],
              )}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              {item.label}
              {typeof item.badge === 'number' && (
                <span className={clsx(
                  'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-label-s font-medium',
                  isActive ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground',
                )}>
                  {item.badge}
                </span>
              )}
              {item.dot && (
                <span
                  aria-label="New"
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive"
                />
              )}
            </Link>
          );
        })}
      </div>
      {panels && panels.length > 0 && activeIndex >= 0 && activeIndex < panels.length && (
        <div
          role="tabpanel"
          aria-labelledby={items[activeIndex] ? `route-tab-${items[activeIndex].href.replace(/\//g, '-')}` : undefined}
          tabIndex={0}
          className="outline-none"
        >
          {panels[activeIndex]}
        </div>
      )}
    </div>
  );
}
