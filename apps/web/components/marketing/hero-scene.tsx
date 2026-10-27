import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

// Isometric hero illustration: a Relay hub dispatching sealed packages onto a
// road toward a waiting van, with an air leg arcing away overhead. Drawn with
// a tiny isometric projection so every face lines up; colours come from the
// --rs-* variables in globals.css so the scene follows the theme.

const U = 26;
const C = Math.cos(Math.PI / 6);
const S = 0.5;

type Pt = [number, number];

function iso(x: number, y: number, z: number): Pt {
  return [(x - y) * C * U, (x + y) * S * U - z * U];
}

const pts = (...p: Pt[]) => p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');

type Tone = 'base' | 'wall' | 'harbor' | 'road' | 'kraft' | 'pot';

function Box({
  x,
  y,
  z,
  dx,
  dy,
  dz,
  tone,
}: {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  tone: Tone;
}) {
  const x1 = x + dx;
  const y1 = y + dy;
  const z1 = z + dz;
  return (
    <g>
      <polygon
        points={pts(iso(x, y1, z), iso(x1, y1, z), iso(x1, y1, z1), iso(x, y1, z1))}
        fill={`var(--rs-${tone}-l)`}
      />
      <polygon
        points={pts(iso(x1, y, z), iso(x1, y1, z), iso(x1, y1, z1), iso(x1, y, z1))}
        fill={`var(--rs-${tone}-r)`}
      />
      <polygon
        points={pts(iso(x, y, z1), iso(x1, y, z1), iso(x1, y1, z1), iso(x, y1, z1))}
        fill={`var(--rs-${tone}-t)`}
      />
    </g>
  );
}

// Text laid onto a face. 'left' = face at constant y (reads along +x),
// 'right' = face at constant x (reads along -y), 'top' = face at constant z.
function FaceText({
  at,
  face,
  size,
  fill,
  weight = 700,
  children,
}: {
  at: [number, number, number];
  face: 'left' | 'right' | 'top';
  size: number;
  fill: string;
  weight?: number;
  children: React.ReactNode;
}) {
  const [X, Y] = iso(...at);
  const m =
    face === 'left' ? [C, S, 0, 1] : face === 'right' ? [C, -S, 0, 1] : [C, S, -C, S];
  return (
    <text
      transform={`matrix(${m.join(' ')} ${X.toFixed(1)} ${Y.toFixed(1)})`}
      fontSize={size}
      fontWeight={weight}
      fill={fill}
      style={{ fontFamily: 'var(--font-brand), sans-serif', letterSpacing: '-0.02em' }}
    >
      {children}
    </text>
  );
}

function Package({ x, y, z, s, h }: { x: number; y: number; z: number; s: number; h: number }) {
  return (
    <g>
      <Box x={x} y={y} z={z} dx={s} dy={s} dz={h} tone="kraft" />
      <polyline
        points={pts(iso(x + s / 2, y, z + h), iso(x + s / 2, y + s, z + h), iso(x + s / 2, y + s, z + h * 0.55))}
        fill="none"
        stroke="var(--rs-tape)"
        strokeWidth={3}
      />
    </g>
  );
}

function Tree({ x, y }: { x: number; y: number }) {
  const [cx, cy] = iso(x + 0.6, y + 0.6, 2.4);
  return (
    <g>
      <Box x={x} y={y} z={0} dx={1.2} dy={1.2} dz={0.7} tone="pot" />
      <rect x={cx - 2} y={cy + 10} width={4} height={26} fill="var(--rs-trunk)" />
      <circle cx={cx} cy={cy} r={24} fill="var(--rs-leaf-2)" />
      <circle cx={cx - 12} cy={cy + 6} r={16} fill="var(--rs-leaf-1)" />
      <circle cx={cx + 10} cy={cy - 12} r={14} fill="var(--rs-leaf-1)" />
      <circle cx={cx + 6} cy={cy + 10} r={12} fill="var(--rs-leaf-3)" />
    </g>
  );
}

export function HeroScene() {
  const [arcX, arcY] = iso(5.2, 3.2, 5.2);
  const [doorX, doorY] = iso(3, 7, 1.2);
  const [headX, headY] = iso(12.5, 9.9, 0.9);

  return (
    <div className="relay-scene relative">
      <svg viewBox="-310 -200 620 580" className="h-auto w-full" role="img" aria-label="A Relay hub sending sealed packages to a van, with a flight leg overhead">
        <defs>
          <radialGradient id="rs-door" cx="50%" cy="60%" r="70%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="55%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </radialGradient>
          <filter id="rs-blur" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id="rs-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>

        {/* ground shadow */}
        <ellipse cx="0" cy="360" rx="290" ry="26" fill="var(--rs-shadow)" filter="url(#rs-soft)" />

        {/* platform + tile grid */}
        <Box x={0} y={0} z={-0.7} dx={13} dy={13} dz={0.7} tone="base" />
        {[3.25, 6.5, 9.75].map((v) => (
          <g key={v} stroke="var(--rs-grid)" strokeWidth={1}>
            <line x1={iso(v, 0, 0)[0]} y1={iso(v, 0, 0)[1]} x2={iso(v, 13, 0)[0]} y2={iso(v, 13, 0)[1]} />
            <line x1={iso(0, v, 0)[0]} y1={iso(0, v, 0)[1]} x2={iso(13, v, 0)[0]} y2={iso(13, v, 0)[1]} />
          </g>
        ))}

        {/* road with glowing signal edge */}
        <Box x={0} y={8.4} z={0} dx={13} dy={2.4} dz={0.12} tone="road" />
        <line
          x1={iso(0, 10.8, 0.12)[0]} y1={iso(0, 10.8, 0.12)[1]}
          x2={iso(13, 10.8, 0.12)[0]} y2={iso(13, 10.8, 0.12)[1]}
          stroke="#F59E0B" strokeWidth={6} filter="url(#rs-blur)" opacity={0.8}
        />
        <line
          x1={iso(0, 10.8, 0.12)[0]} y1={iso(0, 10.8, 0.12)[1]}
          x2={iso(13, 10.8, 0.12)[0]} y2={iso(13, 10.8, 0.12)[1]}
          stroke="#FBBF24" strokeWidth={2}
        />
        <line
          x1={iso(0, 9.6, 0.12)[0]} y1={iso(0, 9.6, 0.12)[1]}
          x2={iso(13, 9.6, 0.12)[0]} y2={iso(13, 9.6, 0.12)[1]}
          stroke="var(--rs-lane)" strokeWidth={2} strokeDasharray="10 12"
        />

        {/* hub building */}
        <Box x={1} y={2} z={0} dx={5} dy={5} dz={4} tone="wall" />
        <polygon
          points={pts(iso(3.4, 2.5, 4), iso(5.5, 2.5, 4), iso(5.5, 4.4, 4), iso(3.4, 4.4, 4))}
          fill="var(--rs-wall-r)"
        />
        <polygon
          points={pts(iso(1.8, 7, 0), iso(4.2, 7, 0), iso(4.2, 7, 2.6), iso(1.8, 7, 2.6))}
          fill="url(#rs-door)"
        />
        <polygon
          points={pts(iso(1.8, 7, 2.6), iso(4.2, 7, 2.6), iso(4.2, 7, 2.3), iso(1.8, 7, 2.3))}
          fill="var(--rs-harbor-l)"
        />
        <circle cx={doorX} cy={doorY} r={34} fill="#F59E0B" opacity={0.25} filter="url(#rs-soft)" />
        <FaceText at={[1.35, 7, 3.25]} face="left" size={28} fill="var(--rs-ink)" weight={800}>
          relay<tspan fill="#F59E0B">.</tspan>
        </FaceText>
        <FaceText at={[4.5, 7, 2.3]} face="left" size={10} fill="var(--rs-ink-soft)" weight={600}>
          Carried by
        </FaceText>
        <FaceText at={[4.5, 7, 1.85]} face="left" size={10} fill="var(--rs-ink-soft)" weight={600}>
          people going
        </FaceText>
        <FaceText at={[4.5, 7, 1.4]} face="left" size={10} fill="var(--rs-ink-soft)" weight={600}>
          your way.
        </FaceText>

        {/* harbor fin with brand promises */}
        <Box x={6.6} y={1.2} z={0} dx={0.4} dy={4} dz={5.4} tone="harbor" />
        <FaceText at={[7, 4.7, 4.5]} face="right" size={15} fill="#FBBF24">Routes.</FaceText>
        <FaceText at={[7, 4.7, 3.8]} face="right" size={15} fill="#FBBF24">People.</FaceText>
        <FaceText at={[7, 4.7, 3.1]} face="right" size={15} fill="#FBBF24">Trust.</FaceText>
        <line
          x1={iso(7, 4.7, 2.5)[0]} y1={iso(7, 4.7, 2.5)[1]}
          x2={iso(7, 3.7, 2.5)[0]} y2={iso(7, 3.7, 2.5)[1]}
          stroke="#FBBF24" strokeWidth={2}
        />

        {/* conveyor from the door to the road */}
        <Box x={1.9} y={7} z={0} dx={2.2} dy={1.4} dz={0.18} tone="road" />
        <Package x={2.5} y={7.25} z={0.18} s={0.9} h={0.8} />

        <Tree x={8.4} y={2.6} />

        {/* signpost */}
        <Box x={11.4} y={5.3} z={0} dx={0.18} dy={0.18} dz={4.4} tone="wall" />
        {[
          { z: 3.6, label: 'Sealed' },
          { z: 2.85, label: 'Escrowed' },
          { z: 2.1, label: 'Tracked' },
        ].map((b) => (
          <g key={b.label}>
            <Box x={11.58} y={4.2} z={b.z} dx={0.12} dy={2.5} dz={0.55} tone="wall" />
            <FaceText at={[11.7, 6.45, b.z + 0.16]} face="right" size={11} fill="var(--rs-ink)" weight={600}>
              {b.label}
            </FaceText>
          </g>
        ))}

        {/* packages on the road */}
        <Package x={4.9} y={8.8} z={0.12} s={1.0} h={0.9} />
        <Package x={6.6} y={9.2} z={0.12} s={0.75} h={0.65} />

        {/* van */}
        <Box x={8.4} y={8.7} z={0.35} dx={3.1} dy={1.7} dz={2} tone="wall" />
        <Box x={11.5} y={8.7} z={0.35} dx={1} dy={1.7} dz={1.3} tone="wall" />
        <polygon
          points={pts(iso(11.5, 8.7, 2.35), iso(12.5, 8.7, 1.65), iso(12.5, 10.4, 1.65), iso(11.5, 10.4, 2.35))}
          fill="var(--rs-wall-t)"
        />
        <polygon
          points={pts(iso(12.5, 8.85, 1.0), iso(12.5, 10.25, 1.0), iso(12.5, 10.25, 1.6), iso(12.5, 8.85, 1.6))}
          fill="var(--rs-glass)"
        />
        <polygon
          points={pts(iso(11.65, 10.4, 1.05), iso(12.35, 10.4, 1.05), iso(12.35, 10.4, 1.55), iso(11.65, 10.4, 1.55))}
          fill="var(--rs-glass)"
        />
        <polygon
          points={pts(iso(8.4, 10.4, 0.9), iso(11.5, 10.4, 0.9), iso(11.5, 10.4, 1.15), iso(8.4, 10.4, 1.15))}
          fill="var(--rs-harbor-l)"
        />
        <FaceText at={[9.0, 10.4, 1.45]} face="left" size={20} fill="var(--rs-ink)" weight={800}>
          relay<tspan fill="#F59E0B">.</tspan>
        </FaceText>
        {[9.2, 11.9].map((wx) => {
          const [ex, ey] = iso(wx, 10.4, 0.35);
          return (
            <g key={wx}>
              <ellipse cx={ex} cy={ey} rx={10} ry={11} fill="var(--rs-tyre)" />
              <ellipse cx={ex} cy={ey} rx={4} ry={4.5} fill="var(--rs-wall-r)" />
            </g>
          );
        })}
        <circle cx={headX} cy={headY} r={4} fill="#FBBF24" />
        <circle cx={headX} cy={headY} r={14} fill="#F59E0B" opacity={0.45} filter="url(#rs-soft)" />

        {/* front plaque */}
        <Box x={0.8} y={11.3} z={0} dx={4.6} dy={1.4} dz={0.3} tone="wall" />
        <FaceText at={[1.15, 11.85, 0.3]} face="top" size={13} fill="var(--rs-ink)" weight={700}>
          Your route is
        </FaceText>
        <FaceText at={[1.15, 12.45, 0.3]} face="top" size={13} fill="var(--rs-ink)" weight={700}>
          someone&apos;s delivery<tspan fill="#F59E0B">.</tspan>
        </FaceText>

        {/* air leg */}
        <path
          d={`M${arcX} ${arcY} C ${arcX + 40} -170, 180 -200, 285 -150`}
          fill="none"
          stroke="var(--rs-route)"
          strokeWidth={2}
          strokeDasharray="5 8"
        />
        <circle cx={arcX} cy={arcY} r={5} fill="#F59E0B" />
        <g transform="translate(232 -170) rotate(14)">
          <path
            d="M-20 -2.5 L4 -2.5 L13 -15 L19 -15 L14 -2.5 L22 -2.5 C27 -2.5 27 2.5 22 2.5 L14 2.5 L19 15 L13 15 L4 2.5 L-20 2.5 Z M-20 -2.5 L-25 -10 L-20 -10 L-13 -2.5 Z"
            fill="var(--rs-harbor-l)"
          />
        </g>
      </svg>

      {/* floating status cards */}
      <div className="absolute left-0 top-[16%] hidden items-center gap-3 rounded-2xl border border-border/70 bg-background/90 px-4 py-3 shadow-2lg backdrop-blur sm:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-subtle text-icon-brand dark:text-accent-signal">
          <Lock size={16} />
        </span>
        <div>
          <p className="text-label-m text-text-tertiary">Held in escrow</p>
          <p className="text-title-s text-text-primary">₦60,750</p>
        </div>
      </div>
      <div className="absolute bottom-[6%] right-[2%] hidden items-center gap-3 rounded-2xl border border-border/70 bg-background/90 px-4 py-3 shadow-2lg backdrop-blur sm:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-subtle text-success-text">
          <ShieldCheck size={16} />
        </span>
        <div>
          <p className="text-label-m text-text-tertiary">Leg 2 of 2 · Abuja → Houston</p>
          <p className="text-title-s text-text-primary">Seal SEAL-1 verified</p>
        </div>
      </div>
    </div>
  );
}
