/**
 * @module routes/purchases
 * @description Stripe payment and checkout routes for AURELION tier upgrades.
 *
 * ## Pricing tiers (in cents)
 * - **BASIC** — 999 cents ($9.99): "Structured Itinerary Plan" — export + booking info
 * - **PREMIUM** — 4999 cents ($49.99): "Concierge Intelligence Plan" — AI chat + insider tips
 *
 * ## Stripe integration
 * - The `stripe` client is instantiated only when `STRIPE_SECRET_KEY` is set.
 * - When null (no key), the system operates in **mock mode**: checkout instantly
 *   creates a "completed" purchase and upgrades the itinerary tier, bypassing Stripe.
 * - Mock mode is useful for development/staging without a real Stripe account.
 *
 * ## App URL resolution (for Stripe redirect URLs)
 * Fallback chain: `NEXT_PUBLIC_APP_URL` -> first `REPLIT_DOMAINS` entry -> `"localhost"`
 *
 * ## Security
 * - The webhook endpoint verifies Stripe signatures via `STRIPE_WEBHOOK_SECRET`
 *   to prevent spoofed payment confirmations.
 * - Without a valid signature, the webhook returns 400.
 */
import { Router } from "express";
import { db, purchasesTable, itinerariesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateCheckoutBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import Stripe from "stripe";

const router = Router();

/**
 * Stripe client instance. Null when STRIPE_SECRET_KEY is not configured,
 * which activates mock/development mode for all payment flows.
 */
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Tier pricing in cents (USD). Used for Stripe line items and mock purchases.
 * BASIC = $9.99, PREMIUM = $49.99.
 */
const PRICES: Record<string, number> = {
  BASIC: 999,
  PREMIUM: 4999,
};

/**
 * @route GET /api/purchases
 * @auth Required
 * @returns {Array<Purchase>} User's purchase history ordered by `createdAt` ascending.
 *   Each purchase includes: id, userId, itineraryId, productType, amount, status,
 *   stripeSessionId, createdAt (ISO 8601).
 * @throws {401} Unauthorized
 * @throws {500} Internal server error
 */
router.get("/purchases", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const purchases = await db.select().from(purchasesTable)
      .where(eq(purchasesTable.userId, user.id))
      .orderBy(purchasesTable.createdAt);
    res.json(purchases.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing purchases");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/purchases/checkout
 * @auth Required
 * @body {CreateCheckoutBody} — `{ itineraryId: number, productType: "BASIC" | "PREMIUM" }`
 * @returns {{ url: string }} Redirect URL — either a Stripe Checkout session URL
 *   (production) or a direct dashboard success URL (mock mode).
 * @throws {400} Zod validation failure or invalid productType
 * @throws {401} Unauthorized
 * @throws {404} Itinerary not found (or belongs to another user)
 * @throws {500} Internal server error / Stripe API failure
 *
 * @description Creates a Stripe Checkout Session for the specified tier upgrade.
 *
 * ## Flow (Stripe mode — `stripe` is not null):
 * 1. Validates body and verifies itinerary ownership.
 * 2. Creates a Stripe Checkout Session with `metadata` containing userId, itineraryId, productType.
 * 3. Inserts a purchase record with status "pending".
 * 4. Returns the Stripe-hosted checkout URL for the client to redirect to.
 * 5. Stripe calls the webhook on completion to finalize the purchase.
 *
 * ## Flow (mock mode — no STRIPE_SECRET_KEY):
 * 1. Validates body and verifies itinerary ownership.
 * 2. Immediately inserts a "completed" purchase with a mock session ID.
 * 3. Immediately upgrades the itinerary's `tierType` to the purchased product.
 * 4. Returns the dashboard success URL directly.
 */
router.post("/purchases/checkout", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = CreateCheckoutBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { itineraryId, productType } = parsed.data;
  if (!PRICES[productType]) {
    res.status(400).json({ error: "Invalid product type" });
    return;
  }
  try {
    const [itinerary] = await db.select().from(itinerariesTable)
      .where(and(eq(itinerariesTable.id, itineraryId), eq(itinerariesTable.userId, user.id)));
    if (!itinerary) { res.status(404).json({ error: "Itinerary not found" }); return; }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost"}`;

    if (!stripe) {
      const [purchase] = await db.insert(purchasesTable).values({
        userId: user.id,
        itineraryId,
        productType,
        amount: PRICES[productType] / 100,
        status: "completed",
        stripeSessionId: `mock_${Date.now()}`,
      }).returning();
      await db.update(itinerariesTable)
        .set({ tierType: productType })
        .where(eq(itinerariesTable.id, itineraryId));
      res.json({ url: `${appUrl}/dashboard?success=true` });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: productType === "BASIC" ? "Structured Itinerary Plan" : "Concierge Intelligence Plan",
            description: productType === "BASIC"
              ? "Export your itinerary with day-by-day structure and booking info"
              : "Full AI concierge, booking intelligence, and insider tips",
          },
          unit_amount: PRICES[productType],
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${appUrl}/dashboard?success=true`,
      cancel_url: `${appUrl}/pricing`,
      metadata: {
        userId: String(user.id),
        itineraryId: String(itineraryId),
        productType,
      },
    });

    await db.insert(purchasesTable).values({
      userId: user.id,
      itineraryId,
      productType,
      amount: PRICES[productType] / 100,
      status: "pending",
      stripeSessionId: session.id,
    });

    res.json({ url: session.url ?? `${appUrl}/dashboard` });
  } catch (err) {
    req.log.error({ err }, "Error creating checkout");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/purchases/webhook
 * @auth None — authenticated via Stripe webhook signature verification
 * @body {Buffer} Raw request body (must NOT be JSON-parsed; requires raw body middleware)
 * @returns {{ received: true }} Acknowledgment to Stripe
 * @throws {400} Missing signature header or signature verification failure
 *
 * @description Stripe webhook handler for asynchronous payment confirmation.
 *
 * ## Handled events:
 * - `checkout.session.completed` — Updates the purchase record to "completed"
 *   and upgrades the itinerary's `tierType` to the purchased product.
 *
 * ## Security:
 * - Verifies the `stripe-signature` header against `STRIPE_WEBHOOK_SECRET`.
 * - If either `stripe` client or `STRIPE_WEBHOOK_SECRET` is missing, the
 *   webhook is a no-op (returns `{ received: true }` immediately).
 * - Metadata (userId, itineraryId, productType) is extracted from the
 *   Stripe session object to identify which records to update.
 */
router.post("/purchases/webhook", async (req, res): Promise<void> => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.json({ received: true });
    return;
  }
  const sig = req.headers["stripe-signature"];
  if (!sig || Array.isArray(sig)) { res.status(400).json({ error: "No signature" }); return; }
  try {
    const event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, itineraryId, productType } = session.metadata ?? {};
      if (userId && itineraryId && productType) {
        await db.update(purchasesTable)
          .set({ status: "completed" })
          .where(eq(purchasesTable.stripeSessionId, session.id));
        await db.update(itinerariesTable)
          .set({ tierType: productType })
          .where(eq(itinerariesTable.id, Number(itineraryId)));
      }
    }
    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "Webhook error");
    res.status(400).json({ error: "Webhook failed" });
  }
});

export default router;
