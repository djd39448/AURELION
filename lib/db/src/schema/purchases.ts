import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * @table purchases
 *
 * Tracks Stripe payment transactions for tier upgrades on the AURELION platform.
 * Each row represents a single checkout session, progressing from "pending"
 * (Stripe checkout created) to "completed" (Stripe webhook confirmed payment).
 *
 * **Business context:**
 * AURELION uses a per-itinerary purchase model with two paid tiers:
 * - **BASIC** ($9.99) — unlocks basic booking guides and itinerary export.
 * - **PREMIUM** ($49.99) — unlocks premium booking guides, insider tips, and AI concierge.
 *
 * When a purchase completes:
 * 1. The Stripe webhook handler sets `status` to `"completed"`.
 * 2. The linked itinerary's `tierType` is upgraded to match `productType`.
 * 3. The user's account `tier` is upgraded if this purchase represents a higher tier.
 *
 * **Relationships:**
 * - Belongs to `users` via `user_id` (no FK constraint; enforced in app code).
 * - Optionally links to `itineraries` via `itinerary_id` — identifies which
 *   itinerary the user is upgrading. Nullable for account-level purchases.
 *
 * **Indexing notes:**
 * - Primary key on `id`.
 * - Consider adding an index on `stripe_session_id` for webhook lookups.
 * - Consider adding an index on `user_id` for purchase-history queries.
 */
export const purchasesTable = pgTable("purchases", {
  /** @param id — Auto-incrementing primary key. */
  id: serial("id").primaryKey(),

  /**
   * @param userId — Soft foreign key to `users.id`.
   * Identifies the user who initiated this purchase. Always required.
   * Used to query purchase history and validate ownership.
   */
  userId: integer("user_id").notNull(),

  /**
   * @param itineraryId — Soft foreign key to `itineraries.id`.
   * Links this purchase to the specific itinerary being upgraded.
   * Nullable — null for account-level tier upgrades that are not
   * tied to a particular itinerary.
   */
  itineraryId: integer("itinerary_id"),

  /**
   * @param productType — The tier being purchased.
   * Valid values: `"BASIC"` | `"PREMIUM"`.
   * Matches the pricing tiers: BASIC = $9.99, PREMIUM = $49.99.
   * Used by the webhook handler to determine what tier to grant.
   * Note: uses UPPER_CASE to match `itineraries.tierType` values.
   */
  productType: text("product_type").notNull(),

  /**
   * @param amount — Purchase price in USD dollars (NOT cents).
   * Expected values: `9.99` (BASIC) or `49.99` (PREMIUM).
   * Stored as a float via Postgres `real` type. This is the actual
   * amount charged to the customer, recorded for audit purposes.
   * Important: Stripe uses cents internally, so the webhook handler
   * divides by 100 before storing here.
   */
  amount: real("amount").notNull(),

  /**
   * @param status — Current state of the payment.
   * Valid values: `"pending"` | `"completed"`.
   * - `"pending"` (default) — Stripe checkout session has been created,
   *   but payment has not been confirmed yet.
   * - `"completed"` — Stripe webhook (`checkout.session.completed`) has
   *   confirmed successful payment. This triggers the tier upgrade.
   * Transitions: pending -> completed (irreversible in current implementation).
   */
  status: text("status").notNull().default("pending"),

  /**
   * @param stripeSessionId — Stripe Checkout Session ID (e.g., `"cs_live_..."` or `"cs_test_..."`).
   * Used by the webhook handler to match incoming Stripe events to purchase rows.
   * In development mode without Stripe keys, set to `"mock_<timestamp>"` for testing.
   * Nullable — null should not occur in practice but is allowed for safety.
   */
  stripeSessionId: text("stripe_session_id"),

  /**
   * @param createdAt — Timestamp (with timezone) of when the checkout session was created.
   * Defaults to `now()` at insert time.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Zod schema for inserting a new purchase row.
 * Omits `id` (auto-generated) and `createdAt` (server-default).
 * Used when creating a new Stripe checkout session.
 *
 * @example
 * ```ts
 * const purchase = insertPurchaseSchema.parse({
 *   userId: user.id,
 *   itineraryId: itinerary.id,
 *   productType: "PREMIUM",
 *   amount: 49.99,
 *   status: "pending",
 *   stripeSessionId: session.id,
 * });
 * await db.insert(purchasesTable).values(purchase);
 * ```
 */
export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({
  id: true,
  createdAt: true,
});

/** TypeScript type for a validated purchase insert payload. */
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

/** TypeScript type for a full purchase row as returned by a `SELECT *` query. */
export type Purchase = typeof purchasesTable.$inferSelect;
