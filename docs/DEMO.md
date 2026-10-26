# Relay Demo Script (5 minutes)

## Setup (before the clock starts)

```sh
docker compose up -d
cp .env.example .env   # ADMIN_EMAILS=admin@relay.example is already in the example
yarn install
yarn workspace @relay/api prisma:migrate
yarn workspace @relay/api prisma:seed
yarn dev
```

Open two browser windows: one as Ada (sender), one as Chika (carrier). A third
as Bola for the transfer. All demo passwords are `password123`.

| Who | Email | Role |
| --- | ----- | ---- |
| Ada (sender) | ada@relay.example | T2, wallet preloaded with ₦100,000 |
| Chika (carrier) | chika@relay.example | Road Awka → Abuja, departs in 5 days |
| Bola (carrier) | bola@relay.example | Air Abuja → Houston, departs in 8 days |
| Dele (backup) | dele@relay.example | Air Abuja → Houston, departs in 9 days |
| Arbiter | admin@relay.example | Rules disputes |

## The story

1. **Ada in Awka** needs to send handmade fabric (5 kg, declared ₦150,000) to
   her sister in Houston. She opens `/search`, fills the stepper, uploads a
   photo.
2. **No direct traveler** — but Relay chains one: Chika by road Tue, then Bola
   by air Fri. Ada picks the route. Each leg requests its carrier.
3. **Ada chats with both** from the shipment page (phone numbers stay masked).
   Chika and Bola accept from `/requests` before the 48h deadline.
4. **Ada pays ~₦60,750.** The pay page shows the split: carrier fees, platform
   fee, insurance premium. The wallet view shows money moved into **escrow** and
   the premium in the pool. Note the receiver code on the success panel (mock
   SMS in the demo).
5. **Chika inspects, seals, and shows a QR** from the leg workspace. Ada scans
   it with her phone, enters seal `SEAL-1`, takes a photo. Custody moves; the
   map starts tracking Chika toward Abuja (run `scripts/simulate-gps.mjs` to
   replay movement live).
6. **In Abuja, Bola shows a QR, Chika scans**, seal matches. Chika's leg
   settles its 70% instantly — show her wallet.
7. **Bola lands in Houston.** The sister gives the delivery code. Bola enters
   it with a photo: escrow releases every remainder plus the platform fee.
8. **Close with fragility** (pick one):
   - Reject a leg as Dele, show the shipment flip to REROUTING, and re-select
     the backup route.
   - Submit a handoff with a wrong seal ID and show escrow freezing with a
     dispute opened for `admin@relay.example`.

## GPS replay helper

```sh
node apps/api/scripts/simulate-gps.mjs --email chika@relay.example \
  --password password123 --shipment <id> --from 6.21,7.07 --to 9.05,7.50
```

(Awka 6.21,7.07 · Abuja 9.05,7.50 · Houston 29.76,-95.37)
