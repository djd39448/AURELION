import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * @table users
 *
 * Core authentication and authorization table for the AURELION platform.
 * Every registered user — both customers and administrators — has exactly one row here.
 *
 * **Business context:**
 * AURELION is a tiered luxury adventure-tourism platform for Aruba. The `role` and `tier`
 * columns together drive the entire entitlement model:
 * - `role` controls admin-panel access (activity CRUD, provider ingest, analytics).
 * - `tier` controls which content a customer can see (booking guides, insider tips,
 *   AI concierge chat, itinerary export).
 *
 * **Relationships:**
 * - One-to-many with `itineraries` (via `itineraries.user_id`).
 * - One-to-many with `purchases` (via `purchases.user_id`).
 * - One-to-many with `chat_sessions` (via `chat_sessions.user_id`).
 * - No FK constraints are enforced at the DB level yet; referential integrity is
 *   maintained in application code.
 *
 * **Indexing notes:**
 * - `email` has a unique index (enforced by `.unique()`).
 * - Consider adding an index on `tier` if tier-based listing queries become common.
 */
export const usersTable = pgTable("users", {
  /** @param id — Auto-incrementing primary key. Used as the foreign-key target in itineraries, purchases, and chat_sessions. */
  id: serial("id").primaryKey(),

  /** @param name — User's display name, shown in the itinerary header and chat UI. Always required at registration. */
  name: text("name").notNull(),

  /**
   * @param email — User's email address; serves as the unique login identifier.
   * Must be unique across all rows — enforced by a Postgres unique index.
   * Used by the auth layer (see `api-server/src/lib/auth.ts`) for credential lookup.
   */
  email: text("email").notNull().unique(),

  /**
   * @param passwordHash — bcrypt hash of the user's password.
   * Generated with 12 salt rounds (see `api-server/src/lib/auth.ts`).
   * Never exposed via API responses; omitted from all select projections
   * except the login/verify-password flow.
   */
  passwordHash: text("password_hash").notNull(),

  /**
   * @param role — Authorization role that controls admin-panel access.
   * Valid values: `"user"` | `"admin"`.
   * - `"user"` (default) — standard customer; content access governed by `tier`.
   * - `"admin"` — full platform access: activity/provider CRUD, analytics dashboard,
   *   and all premium features at no charge (admin accounts bypass tier checks).
   */
  role: text("role").notNull().default("user"),

  /**
   * @param tier — Subscription tier that drives content entitlement checks.
   * Valid values: `"free"` | `"basic"` | `"premium"`.
   * - `"free"` (default) — can browse activities, view descriptions, and create draft itineraries.
   * - `"basic"` ($9.99) — unlocks `basicBookingGuide` on activities and itinerary export.
   * - `"premium"` ($49.99) — unlocks `premiumBookingGuide`, `insiderTips`, and AI concierge chat.
   * Updated when a Stripe webhook confirms a successful purchase (see purchases table).
   */
  tier: text("tier").notNull().default("free"),

  /**
   * @param aiUserIndex — Cached user-index.md content for the AI concierge.
   * Contains quick facts, memory count, and last session summary.
   * Regenerated when important memories (preference/detail/concern) are saved.
   */
  aiUserIndex: text("ai_user_index"),

  /** @param aiIndexUpdatedAt — When the AI user index was last regenerated. */
  aiIndexUpdatedAt: timestamp("ai_index_updated_at", { withTimezone: true }),

  /**
   * @param createdAt — Timestamp (with timezone) of account creation.
   * Defaults to `now()` at insert time. Used for analytics and account-age displays.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Zod schema for inserting a new user row.
 * Omits `id` (auto-generated) and `createdAt` (server-default).
 * Used in the `/auth/register` endpoint for request-body validation.
 *
 * @example
 * ```ts
 * const body = insertUserSchema.parse(req.body);
 * await db.insert(usersTable).values(body);
 * ```
 */
export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});

/** TypeScript type for a validated insert payload (mirrors `insertUserSchema`). */
export type InsertUser = z.infer<typeof insertUserSchema>;

/** TypeScript type for a full user row as returned by a `SELECT *` query. */
export type User = typeof usersTable.$inferSelect;
