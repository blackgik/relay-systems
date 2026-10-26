'use client';

import React, { useId, useMemo } from 'react';
import QRCode from 'qrcode';
import { primitive, semanticHex } from '@/src/tokens';
import RelayMark from '@/public/svgs/relay-mark.svg';

/**
 * A branded QR code: rounded modules on a harbor gradient, rounded finder eyes
 * and the Relay mark in the middle.
 *
 * The colours are fixed, not theme tokens, for the same reason badge colours
 * are: a scanner needs dark modules on a light ground, so the code must look
 * the same in dark mode and on a thermal printout as it does on screen.
 *
 * The logo covers the middle of the code. Error correction is level Q (25% of
 * the code can be lost and it still reads) and the logo takes about 6% of the
 * area. Q rather than H because every step up adds modules: at receipt size
 * a denser code has modules too small to read off a thermal printout.
 *
 * Modules are rounded squares, not dots. Round dots leave gaps a decoder has
 * to bridge when it locates the grid, and in testing a dot code failed to
 * decode where the same code in rounded squares read at full size and at
 * 200px.
 */

const MARGIN = 3; // quiet zone, in modules
const FINDER = 7; // finder patterns are 7×7 modules
const MODULE = 0.88; // a module's drawn size, leaving a hairline between neighbours
const MODULE_RADIUS = 0.3;

const DARK = semanticHex.light.brand; // harbor 900
const DARK_END = primitive.harbor[500]; // still ~8:1 on white
const LIGHT = semanticHex.light.background;

const isFinder = (row: number, col: number, size: number) =>
  (row < FINDER && col < FINDER) ||
  (row < FINDER && col >= size - FINDER) ||
  (row >= size - FINDER && col < FINDER);

export interface QrCodeProps {
  /** What the code encodes — usually a URL. */
  value: string;
  /** Rendered width and height in px. */
  size?: number;
  /** Put the Relay mark in the centre. */
  withLogo?: boolean;
  /** Accessible name — what scanning it does. */
  title?: string;
  className?: string;
}

export const QrCode = ({
  value,
  size = 160,
  withLogo = true,
  title = 'QR code',
  className,
}: QrCodeProps) => {
  // `useId` returns `:r0:`-style ids; colons would need escaping inside url().
  const gradientId = `qr-${useId().replace(/:/g, '')}`;

  const layout = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'Q' });
    const count = qr.modules.size;

    // An odd number of modules, so the badge sits on the centre module.
    let logoModules = Math.round(count * 0.24);
    if (logoModules % 2 === 0) logoModules += 1;
    const logoStart = (count - logoModules) / 2;
    const inLogo = (row: number, col: number) =>
      withLogo &&
      row >= logoStart - 0.5 &&
      row < logoStart + logoModules + 0.5 &&
      col >= logoStart - 0.5 &&
      col < logoStart + logoModules + 0.5;

    // Every dark module as one path of rounded squares — one DOM node instead
    // of hundreds keeps the receipt modal and its print copy cheap.
    const inset = (1 - MODULE) / 2;
    const side = MODULE - MODULE_RADIUS * 2;
    const r = MODULE_RADIUS;
    let modules = '';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (!qr.modules.get(row, col) || isFinder(row, col, count) || inLogo(row, col)) continue;

        const x = col + MARGIN + inset;
        const y = row + MARGIN + inset;
        modules +=
          `M${x + r} ${y}h${side}a${r} ${r} 0 0 1 ${r} ${r}v${side}` +
          `a${r} ${r} 0 0 1 ${-r} ${r}h${-side}a${r} ${r} 0 0 1 ${-r} ${-r}v${-side}` +
          `a${r} ${r} 0 0 1 ${r} ${-r}z`;
      }
    }

    const finders = [
      [0, 0],
      [0, count - FINDER],
      [count - FINDER, 0],
    ].map(([row, col]) => ({ x: col + MARGIN, y: row + MARGIN }));

    return {
      modules,
      finders,
      total: count + MARGIN * 2,
      logo: { start: logoStart + MARGIN, size: logoModules },
    };
  }, [value, withLogo]);

  const { total, logo } = layout;
  const fill = `url(#${gradientId})`;

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      className={className}
      shapeRendering="geometricPrecision"
    >
      <defs>
        {/* User-space, so one sweep runs corner to corner across the dots and
            all three eyes alike, instead of restarting inside each shape. */}
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={0}
          x2={total}
          y2={total}
        >
          <stop offset="0%" stopColor={DARK} />
          <stop offset="100%" stopColor={DARK_END} />
        </linearGradient>
      </defs>

      <rect width={total} height={total} rx={MARGIN} fill={LIGHT} />

      <path d={layout.modules} fill={fill} />

      {layout.finders.map(({ x, y }) => (
        <g key={`${x}-${y}`}>
          {/* Ring: a 7×7 square one module thick, drawn as a stroke on its
              centre line so the corners round evenly inside and out. */}
          <rect
            x={x + 0.5}
            y={y + 0.5}
            width={FINDER - 1}
            height={FINDER - 1}
            rx={1.9}
            fill="none"
            stroke={fill}
            strokeWidth={1}
          />
          <rect x={x + 2} y={y + 2} width={3} height={3} rx={1} fill={fill} />
        </g>
      ))}

      {withLogo && (
        <g>
          <rect
            x={logo.start}
            y={logo.start}
            width={logo.size}
            height={logo.size}
            rx={logo.size * 0.28}
            fill={LIGHT}
          />
          <RelayMark
            x={logo.start + logo.size * 0.18}
            y={logo.start + logo.size * 0.18}
            width={logo.size * 0.64}
            height={logo.size * 0.64}
            aria-hidden
          />
        </g>
      )}
    </svg>
  );
};
