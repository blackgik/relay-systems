import React from 'react';

// Side-profile vehicle art for courier cards (the Horizon board shows trucks;
// ours shows whatever the traveller is actually on). Flat shapes in the
// brand palette with the same ground shadow as the landing scene.

const body = 'var(--veh-body)';
const panel = 'var(--veh-panel)';
const ink = 'var(--veh-ink)';
const glass = '#1d3a47';
const amber = '#F59E0B';

function Wheel({ cx }: { cx: number }) {
  return (
    <g>
      <circle cx={cx} cy={78} r={11} fill="#1a1f26" />
      <circle cx={cx} cy={78} r={4.5} fill="#c8ccd2" />
    </g>
  );
}

function Shadow() {
  return <ellipse cx={100} cy={90} rx={88} ry={5} fill="#0b3b4b" opacity={0.12} />;
}

function Truck() {
  return (
    <svg viewBox="0 0 200 96" className="h-full w-full" aria-hidden>
      <Shadow />
      <rect x={10} y={12} width={124} height={60} rx={4} fill={body} stroke={panel} strokeWidth={2} />
      {[34, 58, 82, 106].map((x) => (
        <line key={x} x1={x} y1={16} x2={x} y2={68} stroke={panel} strokeWidth={2} />
      ))}
      <text x={20} y={46} fontSize={14} fontWeight={800} fill={ink} style={{ fontFamily: 'var(--font-brand)' }}>
        relay<tspan fill={amber}>.</tspan>
      </text>
      <path d="M138 30h28l16 20v22h-44z" fill={body} stroke={panel} strokeWidth={2} />
      <path d="M144 35h20l11 15h-31z" fill={glass} />
      <rect x={176} y={60} width={7} height={5} rx={1} fill={amber} />
      <rect x={10} y={66} width={174} height={6} fill={ink} />
      <Wheel cx={36} />
      <Wheel cx={62} />
      <Wheel cx={160} />
    </svg>
  );
}

function Van() {
  return (
    <svg viewBox="0 0 200 96" className="h-full w-full" aria-hidden>
      <Shadow />
      <path d="M18 20h112c14 0 24 8 34 22l14 6c5 2 8 7 8 12v12H18z" fill={body} stroke={panel} strokeWidth={2} />
      <path d="M132 26h8c9 0 16 6 23 16h-31z" fill={glass} />
      <rect x={100} y={26} width={26} height={16} rx={2} fill={glass} />
      <rect x={18} y={52} width={168} height={5} fill={ink} />
      <text x={30} y={45} fontSize={14} fontWeight={800} fill={ink} style={{ fontFamily: 'var(--font-brand)' }}>
        relay<tspan fill={amber}>.</tspan>
      </text>
      <rect x={180} y={60} width={6} height={5} rx={1} fill={amber} />
      <Wheel cx={50} />
      <Wheel cx={152} />
    </svg>
  );
}

function PlaneArt() {
  return (
    <svg viewBox="0 0 200 96" className="h-full w-full" aria-hidden>
      <ellipse cx={100} cy={90} rx={70} ry={4} fill="#0b3b4b" opacity={0.1} />
      <path d="M20 50c0-6 6-10 14-10h120c14 0 28 5 36 10-8 5-22 10-36 10H34c-8 0-14-4-14-10z" fill={body} stroke={panel} strokeWidth={2} />
      <path d="M150 44c6 0 14 2 20 6h-20z" fill={glass} />
      <path d="M86 52l-30 30h18l40-30z" fill={ink} />
      <path d="M92 48l-24-28h14l34 28z" fill={panel} />
      <path d="M22 46L12 22h12l18 22z" fill={ink} />
      {[60, 72, 84, 96, 108, 120, 132].map((x) => (
        <circle key={x} cx={x} cy={48} r={2.2} fill={glass} />
      ))}
      <rect x={20} y={53} width={150} height={3} fill={amber} opacity={0.9} />
    </svg>
  );
}

function Train() {
  return (
    <svg viewBox="0 0 200 96" className="h-full w-full" aria-hidden>
      <Shadow />
      <path d="M14 22h140c20 0 34 14 34 34v14H14z" fill={body} stroke={panel} strokeWidth={2} />
      <path d="M156 28c12 2 20 10 24 22h-24z" fill={glass} />
      {[24, 54, 84, 114].map((x) => (
        <rect key={x} x={x} y={30} width={22} height={16} rx={3} fill={glass} />
      ))}
      <rect x={14} y={54} width={174} height={5} fill={ink} />
      <rect x={14} y={62} width={174} height={3} fill={amber} />
      {[36, 64, 136, 164].map((x) => (
        <circle key={x} cx={x} cy={78} r={8} fill="#1a1f26" />
      ))}
    </svg>
  );
}

export function VehicleArt({ mode, weight }: { mode: string; weight?: number }) {
  if (mode === 'AIR') return <PlaneArt />;
  if (mode === 'RAIL') return <Train />;
  return (weight ?? 0) > 20 ? <Truck /> : <Van />;
}
