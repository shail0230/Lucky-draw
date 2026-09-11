# Benne Lucky Draw

A responsive restaurant campaign built with a Next.js App Router-compatible React application (Vinext), Tailwind CSS 4, and a Cloudflare D1/SQLite state store. SMS is simulated; coupon allocation and persistence run server-side.

## Run locally

Requires Node.js 22.13+ and npm (Node.js 24+ for the built-in SQLite tests).

```sh
npm run install:ci
npm run db:generate
npm run build
```

Apply the generated migrations once to the local database, in filename order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fluffy_doctor_strange.sql
npm run dev
```

Open the localhost address printed by the server. `npm start` previews the production Worker. Local and hosted databases are separate.

## Try the flow

1. Enter a 10-digit Indian mobile number beginning with 6–9. Formatting and the +91 prefix are normalized.
2. A six-digit demo code appears on the verification screen; no SMS is sent. Incorrect codes can be retried. Codes expire after five minutes; resending after the 30-second cooldown invalidates the previous code.
3. Verify to receive an allocated coupon. Scratch with a mouse or finger, or use the keyboard-accessible “Or tap to reveal” button. About 42% scratching reveals the full card.
4. Copy the coupon code. Reloading preserves the offer and reveal state. Signing out and re-verifying the same number retrieves that same coupon.

Offers are active through **October 5, 2026, 23:59:59.999 Asia/Kolkata**. After that, existing offers display as expired and new allocations are refused. Verified sessions last 24 hours; coupons persist beyond the session. Switching numbers clears the session but never releases the original coupon.

## Exactly 1,000 coupons

`data/coupons.json` is the pre-generated campaign inventory, seeded idempotently into D1. It is server-only and must not be regenerated for a running campaign.

- Layer 1: a cryptographic RNG Fisher–Yates shuffle distributes the prize mix.
- Layer 2: a sequential campaign identifier guarantees coupon uniqueness, with a random suffix for unpredictability.
- Assignment uses the database RNG to select one remaining coupon in a single atomic UPDATE. Database UNIQUE constraints on phone and code and a NOT EXISTS condition prevent duplicate assignments, including concurrent retries.
- Exhaustion returns a friendly message and does not generate more coupons.

The included **sample** mix is 1 yearly dosa prize, 49 complimentary dosa offers, 150 offers at 20% off, 300 at 15% off, and 500 at 10% off. These are configurable demonstration prizes, not approved restaurant promises. Define yearly prize fulfillment, restrictions, and actual promotion terms before launching publicly.

## Integration boundaries

- `lib/api.ts`: frontend API adapter.
- `lib/server/otp.ts`: demo SMS adapter, cryptographic OTP generation, challenge validation. Replace `demoSms.send` with an SMS gateway and remove `demoCode` from both API responses and UI for a real launch. Add production abuse controls at that boundary.
- `lib/server/store.ts`: database adapter and coupon allocation.
- `db/schema.ts` and `drizzle/`: database schema and migrations.
- `lib/campaign.ts`: dates and campaign settings.
- `components/lucky-draw.tsx`: entry and OTP screens.
- `components/scratch-card.tsx`: pointer/touch scratch interaction and accessible reveal.

The app uses HttpOnly, SameSite=Lax cookies with Secure on HTTPS, validates inputs and origins on the server, and stores OTP hashes instead of raw codes. Demo codes are intentionally visible, so simulated OTPs do not prove real ownership of a phone number. Coupon codes are not redemption receipts; staff redemption and real SMS are future integrations, not simulated completed transactions.

## Validation

```sh
node --test tests/campaign.test.mjs
npx tsc --noEmit
npm run build
```

Tests use the actual checked-in migrations and production allocation SQL to exhaust all 1,000 coupons, check idempotent reseeding and duplicate allocation, validate phone normalization, and verify the expiry boundary.

## Photo

The prototype food photo is from [DVG Benne Dosa on Swiggy](https://www.swiggy.com/city/pune/dvg-benne-dosa-kothrud-kothrud-rest770549). No reuse license was supplied. Replace it with the restaurant’s own approved photography before public launch. The “benne” wordmark is a provisional project name.


Verified in the local preview: invalid phone handling, incorrect OTP retry, cooldown, resending invalidates the previous code, successful verification, reveal persistence, logout, normalized returning phone retrieves the original coupon, and a second phone receives a different coupon. TypeScript checking and the production build also passed.
