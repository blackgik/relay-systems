#!/usr/bin/env node
// Replays GPS pings along a straight line for a shipment's active leg.
// Usage:
//   node scripts/simulate-gps.mjs --base http://localhost:3001 \
//     --email chika@relay.example --password password123 \
//     --shipment <id> --from 6.21,7.07 --to 9.05,7.50 --steps 12 --interval 2000
/* eslint-disable no-console */

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1]] : null)).filter(Boolean)
);

const BASE = args.base ?? 'http://localhost:3001';
const [fromLat, fromLng] = (args.from ?? '6.21,7.07').split(',').map(Number);
const [toLat, toLng] = (args.to ?? '9.05,7.50').split(',').map(Number);
const steps = Number(args.steps ?? 12);
const interval = Number(args.interval ?? 2000);

async function main() {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: args.email, password: args.password }),
  });
  if (!login.ok) throw new Error(`login failed: ${login.status}`);
  const { accessToken } = await login.json();

  for (let i = 0; i <= steps; i += 1) {
    const lat = fromLat + ((toLat - fromLat) * i) / steps;
    const lng = fromLng + ((toLng - fromLng) * i) / steps;
    const res = await fetch(`${BASE}/tracking/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ shipmentId: args.shipment, lat, lng }),
    });
    console.log(`ping ${i}/${steps} ${lat.toFixed(4)},${lng.toFixed(4)} -> ${res.status}`);
    if (!res.ok) console.log(await res.text());
    if (i < steps) await new Promise((r) => setTimeout(r, interval));
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
