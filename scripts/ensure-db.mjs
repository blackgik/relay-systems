#!/usr/bin/env node
// Pre-flight for `yarn dev`: make sure Postgres is reachable before turbo
// starts the API. Without this, a stopped database crashes the API with a
// Prisma stack trace and takes the web dev server down with it.
//
// - Postgres already up            -> continue
// - Docker running, DB container down -> `docker compose up -d postgres`, wait
// - Docker not running             -> explain how to fix it and exit 1

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const line = readFileSync(path.join(root, '.env'), 'utf8')
      .split('\n')
      .find((l) => l.startsWith('DATABASE_URL='));
    return line?.slice('DATABASE_URL='.length).replace(/^"|"$/g, '');
  } catch {
    return undefined;
  }
}

function reachable(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

const sh = (cmd) => execSync(cmd, { cwd: root, stdio: 'pipe' }).toString();

const url = databaseUrl();
if (!url) {
  console.error('✖ DATABASE_URL is not set. Copy .env.example to .env first.');
  process.exit(1);
}
const { hostname, port } = new URL(url);
const dbPort = Number(port || 5432);

if (await reachable(hostname, dbPort)) process.exit(0);

const local = ['localhost', '127.0.0.1', '::1'].includes(hostname);
if (!local) {
  console.error(`✖ Can't reach the database at ${hostname}:${dbPort}. Check DATABASE_URL and that the server is up.`);
  process.exit(1);
}

let dockerUp = false;
try {
  sh('docker info');
  dockerUp = true;
} catch {
  /* daemon not running or docker not installed */
}
if (!dockerUp) {
  console.error(
    `✖ Postgres isn't running on localhost:${dbPort}, and Docker isn't either.\n` +
      '  Start Docker Desktop, then run `yarn dev` again (Postgres starts automatically).'
  );
  process.exit(1);
}

console.log('• Postgres is down — starting it with docker compose…');
try {
  sh('docker compose up -d postgres');
} catch (e) {
  console.error(`✖ docker compose up failed:\n${e.stderr?.toString() ?? e.message}`);
  process.exit(1);
}
for (let i = 0; i < 30; i++) {
  if (await reachable(hostname, dbPort)) {
    console.log('✓ Postgres is up.');
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 1000));
}
console.error(`✖ Postgres container started but localhost:${dbPort} still isn't accepting connections.`);
process.exit(1);
