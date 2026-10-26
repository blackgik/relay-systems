# Relay: Peer-to-Peer Logistics Network

Travelers carry packages along routes they are already taking. Packages hop
across several travelers (multileg) to reach a destination. Money sits in
escrow until delivery is confirmed.

## Quickstart

Prereqs: Node 20+, Yarn 4 (via corepack), Docker.

```sh
yarn install
docker compose up -d
cp .env.example .env
yarn workspace @relay/api prisma:migrate
yarn workspace @relay/api prisma:seed
yarn dev
```

| Service | URL                     |
| ------- | ----------------------- |
| Web     | http://localhost:3000   |
| API     | http://localhost:3001 (`/health`) |
| MinIO   | http://localhost:9001   |

Demo accounts (password `password123` for all): `ada@relay.example` (sender),
`chika@relay.example`, `bola@relay.example`, `dele@relay.example` (carriers),
`admin@relay.example` (arbiter). See [docs/DEMO.md](docs/DEMO.md) for the
5-minute demo script.

## Layout

- `apps/api` — NestJS modular monolith (`src/modules/`: identity, kyc, trips,
  routing, shipments, ledger, custody, tracking, chat, disputes, insurance,
  notifications, integrations)
- `apps/web` — Next.js sender + carrier + admin app
- `packages/shared` — shared enums, constants, policy defaults

## Useful commands

```sh
yarn build                    # build all workspaces
yarn workspace @relay/api test
yarn workspace @relay/web test
yarn workspace @relay/api prisma:generate
node apps/api/scripts/simulate-gps.mjs --help
```
