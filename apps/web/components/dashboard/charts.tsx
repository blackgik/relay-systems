'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { formatMinors, formatMinorsShort } from '@/lib/money';
import type { MonthPoint } from '@/lib/dashboard-types';
import { monthLabel } from './widgets';

// Hand-rolled SVG charts (no chart library in the bundle). Mark specs follow
// the dataviz rules: bars <= 24px with a 4px rounded data end, a 2px surface
// gap between neighbours, hairline grid, text in text tokens, hover tooltip
// on every mark, legend for 2+ series, and a table view.

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/** Clean y-axis ticks: 0 and three round steps above the max. */
function niceTicks(max: number) {
  if (max <= 0) return [0, 1, 2, 3];
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return [0, step, step * 2, step * 3];
}

/** Bar path: square at the baseline, 4px radius at the data end. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  if (h <= 0) return '';
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
  const left = Math.min(Math.max(x, 90), width - 90);
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-popover px-3 py-2 text-body-s shadow-dropdown"
      style={{ left, top: y - 8 }}
    >
      {children}
    </div>
  );
}

function Swatch({ kind }: { kind: 'earned' | 'spent' | 'projected' }) {
  if (kind === 'projected') {
    return (
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-[3px]"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, var(--chart-earned) 0 2px, transparent 2px 4px)',
          boxShadow: 'inset 0 0 0 1px var(--chart-earned)',
        }}
      />
    );
  }
  return <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: `var(--chart-${kind})` }} />;
}

export function MoneyChart({
  series,
  projected,
  currency,
  height = 240,
  labels = { earned: 'Earned carrying', spent: 'Spent sending' },
  ariaLabel = 'Monthly earnings and spending, with next month projected',
}: {
  series: MonthPoint[];
  /** Next month's projected earnings; null draws no projection column. */
  projected: number | null;
  currency: string;
  height?: number;
  /** Series names (the wallet calls them money in / money out). */
  labels?: { earned: string; spent: string };
  ariaLabel?: string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const patternId = useId().replace(/:/g, '');

  const nextMonth = (() => {
    const [y, m] = series[series.length - 1].month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  })();
  const groups = [
    ...series.map((s) => ({ ...s, projected: false })),
    ...(projected === null ? [] : [{ month: nextMonth, earned: projected, spent: 0, net: projected, projected: true }]),
  ];

  const pad = { top: 16, right: 8, bottom: 28, left: 52 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const ticks = niceTicks(Math.max(...groups.map((g) => Math.max(g.earned, g.spent))));
  const top = ticks[ticks.length - 1];
  const yOf = (v: number) => pad.top + innerH - (v / top) * innerH;
  const band = innerW / groups.length;
  const barW = Math.min(24, Math.max(6, (band * 0.6 - 2) / 2));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-body-s text-text-secondary">
        <span className="flex items-center gap-1.5"><Swatch kind="earned" /> {labels.earned}</span>
        <span className="flex items-center gap-1.5"><Swatch kind="spent" /> {labels.spent}</span>
        {projected !== null && <span className="flex items-center gap-1.5"><Swatch kind="projected" /> Projected</span>}
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          className="ml-auto text-body-s font-medium text-text-link hover:underline dark:text-harbor-200"
        >
          {table ? 'View chart' : 'View as table'}
        </button>
      </div>

      {table ? (
        <table className="w-full text-left text-body-s">
          <thead className="text-text-tertiary">
            <tr>
              <th className="py-2 font-medium">Month</th>
              <th className="py-2 text-right font-medium">{labels.earned}</th>
              <th className="py-2 text-right font-medium">{labels.spent}</th>
              <th className="py-2 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text-primary">
            {groups.map((g) => (
              <tr key={g.month}>
                <td className="py-2">{monthLabel(g.month, 'long')}{g.projected && ' (projected)'}</td>
                <td className="py-2 text-right">{formatMinors(g.earned, currency)}</td>
                <td className="py-2 text-right">{g.projected ? '—' : formatMinors(g.spent, currency)}</td>
                <td className="py-2 text-right">{formatMinors(g.net, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
          {width > 0 && (
            <svg width={width} height={height} role="img" aria-label={ariaLabel}>
              <defs>
                <pattern id={patternId} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="5" height="5" fill="var(--chart-earned)" opacity="0.18" />
                  <rect width="2" height="5" fill="var(--chart-earned)" />
                </pattern>
              </defs>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={pad.left} x2={width - pad.right} y1={yOf(t)} y2={yOf(t)} stroke="var(--chart-grid)" strokeWidth={1} />
                  <text x={pad.left - 8} y={yOf(t)} dy="0.35em" textAnchor="end" className="fill-text-tertiary text-[11px]">
                    {formatMinorsShort(t, currency)}
                  </text>
                </g>
              ))}
              {groups.map((g, i) => {
                const cx = pad.left + band * i + band / 2;
                const active = hover === i;
                return (
                  <g key={g.month} opacity={hover === null || active ? 1 : 0.45}>
                    {g.projected ? (
                      <path d={barPath(cx - barW / 2, yOf(g.earned), barW, pad.top + innerH - yOf(g.earned))} fill={`url(#${patternId})`} />
                    ) : (
                      <>
                        <path d={barPath(cx - barW - 1, yOf(g.earned), barW, pad.top + innerH - yOf(g.earned))} fill="var(--chart-earned)" />
                        <path d={barPath(cx + 1, yOf(g.spent), barW, pad.top + innerH - yOf(g.spent))} fill="var(--chart-spent)" />
                      </>
                    )}
                    <text x={cx} y={height - 8} textAnchor="middle" className={clsx('text-[11px]', active ? 'fill-text-primary font-semi-bold' : 'fill-text-tertiary')}>
                      {monthLabel(g.month)}
                    </text>
                    {/* hit target: the whole band, taller than any mark */}
                    <rect
                      x={pad.left + band * i}
                      y={pad.top}
                      width={band}
                      height={innerH}
                      fill="transparent"
                      onMouseEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      tabIndex={0}
                      aria-label={`${monthLabel(g.month, 'long')}: ${labels.earned} ${formatMinors(g.earned, currency)}${g.projected ? ' projected' : `, ${labels.spent} ${formatMinors(g.spent, currency)}`}`}
                    />
                  </g>
                );
              })}
              <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="hsl(var(--border-strong))" strokeWidth={1} />
            </svg>
          )}
          {hover !== null && width > 0 && (
            <Tooltip x={pad.left + band * hover + band / 2} y={yOf(Math.max(groups[hover].earned, groups[hover].spent))} width={width}>
              <p className="mb-1 font-semi-bold text-text-primary">
                {monthLabel(groups[hover].month, 'long')}
                {groups[hover].projected && <span className="font-normal text-text-tertiary"> · projected</span>}
              </p>
              <p className="flex items-center gap-2 text-text-secondary">
                <Swatch kind={groups[hover].projected ? 'projected' : 'earned'} /> {labels.earned}
                <span className="ml-auto pl-4 font-semi-bold text-text-primary">{formatMinors(groups[hover].earned, currency)}</span>
              </p>
              {!groups[hover].projected && (
                <>
                  <p className="flex items-center gap-2 text-text-secondary">
                    <Swatch kind="spent" /> {labels.spent}
                    <span className="ml-auto pl-4 font-semi-bold text-text-primary">{formatMinors(groups[hover].spent, currency)}</span>
                  </p>
                  <p className="mt-1 flex border-t border-border pt-1 text-text-secondary">
                    Net
                    <span className={clsx('ml-auto pl-4 font-semi-bold', groups[hover].net >= 0 ? 'text-success-text' : 'text-destructive')}>
                      {formatMinors(groups[hover].net, currency)}
                    </span>
                  </p>
                </>
              )}
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}

/** Crextio-style weekly activity: thin capsules, current week in the accent. */
export function ActivityBars({
  points,
  label,
  height = 150,
}: {
  points: { weekStart: string; value: number }[];
  label: string;
  height?: number;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const pad = { top: 26, bottom: 22 };
  const innerH = height - pad.top - pad.bottom;
  const band = width / points.length;
  const barW = Math.min(10, band * 0.4);
  const last = points.length - 1;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${label}, weekly for the last ${points.length} weeks`}>
          {points.map((p, i) => {
            const cx = band * i + band / 2;
            const h = Math.max(barW, (p.value / max) * innerH);
            const y = pad.top + innerH - h;
            const current = i === last;
            return (
              <g key={p.weekStart}>
                {/* full-height track so empty weeks still read as a slot */}
                <rect x={cx - barW / 2} y={pad.top} width={barW} height={innerH} rx={barW / 2} fill="var(--chart-grid)" />
                <rect x={cx - barW / 2} y={y} width={barW} height={h} rx={barW / 2} fill={current || hover === i ? 'var(--chart-earned)' : 'var(--chart-muted)'} />
                {current && (
                  <text x={cx} y={y - 8} textAnchor="middle" className="fill-text-primary text-[12px] font-semi-bold">
                    {p.value}
                  </text>
                )}
                <text x={cx} y={height - 4} textAnchor="middle" className="fill-text-tertiary text-[10px]">
                  {i === last ? 'This wk' : fmt(p.weekStart).split(' ')[0]}
                </text>
                <rect
                  x={band * i}
                  y={0}
                  width={band}
                  height={height}
                  fill="transparent"
                  tabIndex={0}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  aria-label={`Week of ${fmt(p.weekStart)}: ${p.value}`}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tooltip x={band * hover + band / 2} y={pad.top + innerH - Math.max(barW, (points[hover].value / max) * innerH)} width={width}>
          <p className="text-text-tertiary">Week of {fmt(points[hover].weekStart)}</p>
          <p className="font-semi-bold text-text-primary">
            {points[hover].value} {label.toLowerCase()}
          </p>
        </Tooltip>
      )}
    </div>
  );
}

/** Progress ring with a centred figure (Crextio "time tracker"). */
export function Ring({
  value,
  size = 156,
  stroke = 12,
  center,
  caption,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  center: React.ReactNode;
  caption?: React.ReactNode;
  label: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(v * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chart-grid)" strokeWidth={stroke} strokeDasharray="2 5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--chart-earned)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-headline-m text-text-primary">{center}</div>
        {caption && <div className="text-body-s text-text-tertiary">{caption}</div>}
      </div>
    </div>
  );
}

/** Small 6-month column chart for profiles (single series, no legend needed). */
export function MonthlyColumns({ points, label }: { points: { month: string; count: number }[]; label: string }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 150;
  const pad = { top: 22, bottom: 22 };
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...points.map((p) => p.count));
  const band = width / points.length;
  const barW = Math.min(24, band * 0.5);
  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${label} per month`}>
          <line x1={0} x2={width} y1={pad.top + innerH} y2={pad.top + innerH} stroke="hsl(var(--border-strong))" strokeWidth={1} />
          {points.map((p, i) => {
            const cx = band * i + band / 2;
            const h = (p.count / max) * innerH;
            return (
              <g key={p.month}>
                <path d={barPath(cx - barW / 2, pad.top + innerH - h, barW, h)} fill={hover === i || i === points.length - 1 ? 'var(--chart-earned)' : 'var(--chart-muted)'} />
                {(i === points.length - 1 || p.count === max) && p.count > 0 && (
                  <text x={cx} y={pad.top + innerH - h - 6} textAnchor="middle" className="fill-text-primary text-[11px] font-semi-bold">
                    {p.count}
                  </text>
                )}
                <text x={cx} y={height - 4} textAnchor="middle" className="fill-text-tertiary text-[11px]">
                  {monthLabel(p.month)}
                </text>
                <rect
                  x={band * i}
                  y={0}
                  width={band}
                  height={height}
                  fill="transparent"
                  tabIndex={0}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  aria-label={`${monthLabel(p.month, 'long')}: ${p.count}`}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tooltip x={band * hover + band / 2} y={pad.top + innerH - (points[hover].count / max) * innerH} width={width}>
          <p className="text-text-tertiary">{monthLabel(points[hover].month, 'long')}</p>
          <p className="font-semi-bold text-text-primary">
            {points[hover].count} {label.toLowerCase()}
          </p>
        </Tooltip>
      )}
    </div>
  );
}
