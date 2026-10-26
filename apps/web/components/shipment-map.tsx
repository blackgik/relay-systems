'use client';

import React from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPing {
  lat: number;
  lng: number;
  at: string;
}

export interface MapCheckpoint {
  lat: number | null;
  lng: number | null;
  label: string;
  at: string;
}

const HARBOR = '#0B3B4B';
const SIGNAL = '#F59E0B';

export function ShipmentMap({ pings, checkpoints }: { pings: MapPing[]; checkpoints: MapCheckpoint[] }) {
  const points: [number, number][] = [
    ...pings.map((p) => [p.lat, p.lng] as [number, number]),
    ...checkpoints
      .filter((c) => c.lat !== null && c.lng !== null)
      .map((c) => [c.lat as number, c.lng as number] as [number, number]),
  ];
  const center: [number, number] =
    points.length > 0
      ? [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length]
      : [9.05, 7.5]; // Abuja fallback

  return (
    <MapContainer
      center={center}
      zoom={points.length > 0 ? 5 : 4}
      style={{ height: 360, width: '100%', borderRadius: 8 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pings.length > 1 && (
        <Polyline positions={pings.map((p) => [p.lat, p.lng] as [number, number])} color={HARBOR} weight={3} />
      )}
      {pings.map((p, i) => (
        <CircleMarker key={`p${i}`} center={[p.lat, p.lng]} radius={4} color={HARBOR} fillOpacity={0.7}>
          <Popup>{new Date(p.at).toLocaleString('en-GB')}</Popup>
        </CircleMarker>
      ))}
      {checkpoints
        .filter((c) => c.lat !== null && c.lng !== null)
        .map((c, i) => (
          <CircleMarker
            key={`c${i}`}
            center={[c.lat as number, c.lng as number]}
            radius={8}
            color={SIGNAL}
            fillColor={SIGNAL}
            fillOpacity={0.9}
          >
            <Popup>
              {c.label} — {new Date(c.at).toLocaleString('en-GB')}
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}
