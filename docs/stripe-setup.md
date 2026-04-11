# Stripe Integration Setup

## Overview

AURELION uses Stripe for end-to-end checkout for Basic ($9.99) and Premium ($49.99) tiers.
The API server runs in **mock mode** when `STRIPE_SECRET_KEY` is not set — useful for local dev.

## Required Environment Variables (Railway)

Set these in the Railway dashboard for the `api-server` service:

| Variable              | Description                                    |
|-----------------------|------------------------------------------------|
| `STRIPE_SECRET_KEY`   | Test mode secret key from Stripe Dashboard     |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret from Stripe Dashboard |

## Step 1: Get Test Mode Keys

1. Log into [dashboard.stripe.com](https://dashboard.stripe.com)
2. Toggle to **Test mode** (top right)
3. Go to **Developers → API keys**
4. Copy the **Secret key** (`sk_test_...`)

## Step 2: Create Webhook Endpoint

1. Go to **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://api-server-production-2f10.up.railway.app/api/purchases/webhook`
3. Events to listen to: `checkout.session.completed`
4. After creating, reveal the **Signing secret** (`whsec_...`)

## Step 3: Set Railway Env Vars

```bash
cd ~/AURELION
railway variables --set STRIPE_SECRET_KEY=sk_test_...
railway variables --set STRIPE_WEBHOOK_SECRET=whsec_...
```

## Step 4: Test End-to-End

Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.

1. Register/login at the frontend
2. Go to `/pricing`
3. Click "Upgrade to Planner" (BASIC tier)
4. Complete checkout with test card
5. Verify itinerary and user tier upgrade in the database

## Tier Mapping

| productType | users.tier | itineraries.tierType | Price  |
|-------------|------------|----------------------|--------|
| `BASIC`     | `basic`    | `BASIC`              | $9.99  |
| `PREMIUM`   | `premium`  | `PREMIUM`            | $49.99 |

## Note on Stripe Products

Products are created dynamically via `price_data` on each checkout session — no pre-creation needed in test mode. In production, consider pre-creating products in Stripe for better analytics.
