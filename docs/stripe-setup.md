# Stripe Integration Setup

## Overview

AURELION uses Stripe for end-to-end checkout for Basic ($9.99) and Premium ($49.99) tiers.
The API server runs in **mock mode** when `STRIPE_SECRET_KEY` is not set — useful for local dev.

## Current Production Configuration (Railway)

All variables are set and active in Railway (`api-server` service, `production` environment):

| Variable                | Value (truncated)           | Status  |
|-------------------------|-----------------------------|---------|
| `STRIPE_SECRET_KEY`     | `sk_test_51TL66l...`        | ✅ Set  |
| `STRIPE_PUBLISHABLE_KEY`| `pk_test_51TL66l...`        | ✅ Set  |
| `STRIPE_WEBHOOK_SECRET` | `whsec_5R8WFz7q...`         | ✅ Set  |
| `NEXT_PUBLIC_APP_URL`   | `https://aurelion-ten.vercel.app` | ✅ Set |

## Stripe Webhook Endpoint

Registered programmatically via Stripe API (test mode):

- **Endpoint ID**: `we_1TPnQ8PMQ5I700XtsitVSkwE`
- **URL**: `https://api-server-production-2f10.up.railway.app/api/purchases/webhook`
- **Events**: `checkout.session.completed`
- **Status**: enabled

> **Note on URL**: The webhook path is `/api/purchases/webhook` (not `/api/webhooks/stripe`).
> This is where the raw body middleware is wired in `app.ts` — Stripe signature verification
> requires the raw unparsed body, so the endpoint cannot be moved without also updating `app.ts`.

## Setting Up From Scratch

### Step 1: Get Test Mode Keys

1. Log into [dashboard.stripe.com](https://dashboard.stripe.com)
2. Toggle to **Test mode** (top right)
3. Go to **Developers → API keys** — copy the **Secret key** (`sk_test_...`)

### Step 2: Create Webhook Endpoint

Option A — via Stripe Dashboard:
1. **Developers → Webhooks → Add endpoint**
2. URL: `https://api-server-production-2f10.up.railway.app/api/purchases/webhook`
3. Events: `checkout.session.completed`
4. Reveal the **Signing secret** (`whsec_...`)

Option B — via Stripe API (programmatic):
```bash
curl -X POST https://api.stripe.com/v1/webhook_endpoints \
  -u "sk_test_...: " \
  -d "url=https://api-server-production-2f10.up.railway.app/api/purchases/webhook" \
  -d "enabled_events[]=checkout.session.completed"
# Returns { "secret": "whsec_..." }
```

### Step 3: Set Railway Env Vars

```bash
cd ~/AURELION
railway variables --set "STRIPE_SECRET_KEY=sk_test_..."
railway variables --set "STRIPE_WEBHOOK_SECRET=whsec_..."
railway variables --set "NEXT_PUBLIC_APP_URL=https://aurelion-ten.vercel.app"
```

## Test End-to-End

Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.

1. Register/login at `https://aurelion-ten.vercel.app`
2. Go to `/pricing`
3. Click **Upgrade to Planner** (BASIC) or **Unlock Concierge** (PREMIUM)
4. Complete checkout with the test card
5. Confirm redirect to `/dashboard?success=true`
6. Verify `users.tier` upgraded (`basic` or `premium`) via `GET /api/auth/me`

## Tier Mapping

| productType | users.tier | itineraries.tierType | Price  |
|-------------|------------|----------------------|--------|
| `BASIC`     | `basic`    | `BASIC`              | $9.99  |
| `PREMIUM`   | `premium`  | `PREMIUM`            | $49.99 |

Account-level upgrades (from `/pricing`, `itineraryId: 0`) update `users.tier`.
Itinerary-linked upgrades additionally update `itineraries.tierType` for the specific itinerary.

## Stripe Products

Products are created dynamically via `price_data` on each checkout session — no pre-creation
needed in test mode. In production, consider pre-creating products in Stripe for better analytics.
