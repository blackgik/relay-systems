'use client';

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CITIES } from '@/lib/cities';

// Stylised street-map panel (the concept's grey city blocks) with the
// shipment's stops laid out by real geography. The route draws itself in,
// the travelled part is solid, and the parcel marker glides to the actual
// journey progress. Keyframes: `tr-*` in globals.css.

const W = 640;
const H = 220;
const PAD = 36;

function layout(stops: string[]) {
  const known = stops.map((s) => CITIES[s]);
  if (known.every(Boolean) && stops.length > 1) {
    const lats = known.map((c) => c!.lat);
    const lngs = known.map((c) => c!.lng);
    const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    const spanLng = maxLng - minLng || 1;
    const spanLat = maxLat - minLat || 1;
    // Read origin -> destination left to right, even for westbound routes.
    const westbound = known[known.length - 1]!.lng < known[0]!.lng;
    const geo = known.map((c) => ({
      x: PAD + ((westbound ? maxLng - c!.lng : c!.lng - minLng) / spanLng) * (W - PAD * 2),
      // Flatten very north-south routes so the panel stays readable.
      y: H - PAD - ((c!.lat - minLat) / spanLat) * (H - PAD * 2) * 0.8 - (H - PAD * 2) * 0.1,
    }));
    // A short hop next to an ocean crossing (Awka -> Abuja -> Houston) would
    // put two stops on top of each other: space them evenly instead, keeping
    // each stop's north/south position.
    const sorted = [...geo].sort((a, b) => a.x - b.x);
    const crowded = sorted.some((p, i) => i > 0 && p.x - sorted[i - 1].x < 120);
    if (!crowded) return geo;
    return geo.map((p, i) => ({ x: PAD + (i / (geo.length - 1)) * (W - PAD * 2), y: p.y }));
  }
  // Unknown city: space the stops evenly left to right.
  return stops.map((_, i) => ({ x: PAD + (i / Math.max(1, stops.length - 1)) * (W - PAD * 2), y: i % 2 ? PAD + 20 : H - PAD - 20 }));
}

/** Street-style route: each hop goes across, then up/down, then across. */
function routePath(points: { x: number; y: number }[]) {
  return points
    .map((p, i) => {
      if (i === 0) return `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      const prev = points[i - 1];
      const mid = (prev.x + p.x) / 2;
      return `L${mid.toFixed(1)} ${prev.y.toFixed(1)} L${mid.toFixed(1)} ${p.y.toFixed(1)} L${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(' ');
}

export function RouteMap({
  stops,
  progress,
  moving,
}: {
  /** Origin, then each leg's destination. */
  stops: string[];
  progress: number;
  moving: boolean;
}) {
  const points = useMemo(() => layout(stops), [stops]);
  const d = useMemo(() => routePath(points), [points]);
  const pathRef = useRef<SVGPathElement>(null);
  const patternId = `tr-blocks-${useId().replace(/:/g, '')}`;
  const [length, setLength] = useState(0);
  const [marker, setMarker] = useState(points[0]);

  useLayoutEffect(() => {
    if (pathRef.current) setLength(pathRef.current.getTotalLength());
  }, [d]);

  useEffect(() => {
    if (!pathRef.current || !length) return;
    const p = pathRef.current.getPointAtLength(length * Math.min(1, Math.max(0, progress)));
    // Next frame, so the CSS transition glides from the start the first time.
    const id = requestAnimationFrame(() => setMarker({ x: p.x, y: p.y }));
    return () => cancelAnimationFrame(id);
  }, [length, progress]);

  const done = Math.min(1, Math.max(0, progress));
  const last = points[points.length - 1];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--tr-map-bg)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Route ${stops.join(' to ')}, ${Math.round(done * 100)}% complete`}>
        <defs>
          <pattern id={patternId} width="64" height="44" patternUnits="userSpaceOnUse">
            <rect x="4" y="4" width="26" height="16" rx="3" fill="var(--tr-block)" />
            <rect x="34" y="4" width="26" height="16" rx="3" fill="var(--tr-block)" />
            <rect x="4" y="24" width="56" height="16" rx="3" fill="var(--tr-block)" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill={`url(#${patternId})`} />
        {/* full route, dashed, drawn in on mount */}
        <path d={d} fill="none" stroke="var(--tr-route)" strokeWidth="3" strokeDasharray="7 7" strokeLinejoin="round" className="tr-route-draw" />
        {/* travelled part */}
        <path
          ref={pathRef}
          d={d}
          fill="none"
          stroke="var(--tr-done)"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{
            strokeDasharray: length ? `${length * done} ${length}` : undefined,
            transition: 'stroke-dasharray 1.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        {/* intermediate handoff cities */}
        {points.slice(1, -1).map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="7" fill="var(--tr-map-bg)" stroke="var(--tr-done)" strokeWidth="3" />
          </g>
        ))}
        {/* origin */}
        <circle cx={points[0].x} cy={points[0].y} r="11" fill="var(--tr-ink)" />
        <path d={`M${points[0].x - 4} ${points[0].y + 3}l4-8 4 8z`} fill="#fff" />
        {/* destination pin */}
        <g transform={`translate(${last.x} ${last.y})`}>
          <ellipse cx="0" cy="2" rx="8" ry="3" fill="var(--tr-ink)" opacity="0.2" />
          <path d="M0 0c-7-9-11-14-11-20a11 11 0 1 1 22 0c0 6-4 11-11 20z" fill="var(--tr-ink)" />
          <circle cx="0" cy="-20" r="4" fill="#fff" />
        </g>
        {/* city labels sit beside their stop, on a halo so the blocks don't show through */}
        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={p.x}
            y={p.y + (p.y > H / 2 ? -18 : 26)}
            dy={i === points.length - 1 && p.y > H / 2 ? -14 : 0}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            className="fill-text-primary font-semi-bold"
            fontSize={22}
            style={{ paintOrder: 'stroke', stroke: 'var(--tr-map-bg)', strokeWidth: 5, strokeLinejoin: 'round' }}
          >
            {stops[i]}
          </text>
        ))}
        {/* parcel marker */}
        <g style={{ transform: `translate(${marker.x}px, ${marker.y}px)`, transition: 'transform 1.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          {moving && <circle r="9" fill="#F59E0B" className="tr-pulse" />}
          <circle r="9" fill="#F59E0B" stroke="var(--tr-map-bg)" strokeWidth="3" />
          <rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5" fill="var(--tr-ink)" />
        </g>
      </svg>
    </div>
  );
}
